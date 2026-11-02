import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { serviceRequests, type ServiceRequest } from "@/db/schema/operations";
import type { SessionUser } from "@/auth/session";
import { assert, canHandleServiceRequests } from "./permissions";
import { enqueue, recordAudit } from "./audit";

export type ServiceKind = ServiceRequest["kind"];
export type ServiceStatus = ServiceRequest["status"];

export const serviceKinds: ServiceKind[] = ["lab_clearance", "maintenance", "chemicals"];
export const serviceStatuses: ServiceStatus[] = ["open", "in_progress", "done", "declined"];

/** The fields each kind asks for beyond name, e-mail and message. */
export const serviceDetailFields: Record<ServiceKind, readonly string[]> = {
  lab_clearance: ["timeframe", "scope"],
  maintenance: ["instrument", "serviceType"],
  chemicals: ["substance", "cas", "quantity", "expiry", "sealed", "sds"],
};

export class ServiceRequestError extends Error {}

export type ServiceRequestInput = {
  kind: ServiceKind;
  contactName: string;
  email: string;
  phone?: string;
  organisationName?: string;
  location?: string;
  message?: string;
  details: Record<string, string>;
};

/**
 * What must hold before a request is taken. Chemicals are passed on only
 * between organisations, in unopened original containers with a safety data
 * sheet; everything else is refused before it reaches anyone.
 */
export function checkServiceRequest(input: ServiceRequestInput): string | null {
  if (input.kind === "maintenance" && !input.details.instrument?.trim()) return "invalid";
  if (input.kind === "chemicals") {
    if (!input.organisationName?.trim()) return "chemicals_rules";
    if (input.details.sealed !== "yes" || input.details.sds !== "yes") return "chemicals_rules";
    if (!input.details.substance?.trim() || !input.details.quantity?.trim()) return "invalid";
  }
  return null;
}

export async function createServiceRequest(user: SessionUser | null, input: ServiceRequestInput) {
  const problem = checkServiceRequest(input);
  if (problem) throw new ServiceRequestError(problem);

  // Only the fields of this kind are kept, trimmed and short.
  const details = Object.fromEntries(
    serviceDetailFields[input.kind]
      .map((key) => [key, (input.details[key] ?? "").trim().slice(0, 500)] as const)
      .filter(([, value]) => value),
  );

  const [created] = await db
    .insert(serviceRequests)
    .values({
      kind: input.kind,
      profileId: user?.id ?? null,
      contactName: input.contactName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      organisationName: input.organisationName?.trim() || null,
      location: input.location?.trim() || null,
      message: input.message?.trim() || null,
      details,
    })
    .returning();

  await enqueue("service_request.created", { serviceRequestId: created!.id });
  return created!;
}

export async function updateServiceRequest(
  user: SessionUser,
  id: string,
  change: { status: ServiceStatus; adminNote?: string },
) {
  assert(canHandleServiceRequests(user), "Admin only");
  const [before] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id)).limit(1);
  assert(!!before, "Request not found");

  const [after] = await db
    .update(serviceRequests)
    .set({
      status: change.status,
      adminNote: change.adminNote?.trim() || null,
      handledBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(serviceRequests.id, id))
    .returning();

  await recordAudit({
    actorId: user.id,
    action: "service_request.updated",
    targetType: "service_request",
    targetId: id,
    summary: `${before!.kind} · ${before!.contactName} · ${change.status}`,
    before: { status: before!.status, adminNote: before!.adminNote },
    after: { status: after!.status, adminNote: after!.adminNote },
  });
  return after!;
}

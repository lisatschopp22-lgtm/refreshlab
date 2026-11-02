"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentUser, requireAdmin } from "@/auth/session";
import {
  createServiceRequest,
  serviceDetailFields,
  serviceKinds,
  ServiceRequestError,
  serviceStatuses,
  updateServiceRequest,
} from "@/domain/service-requests";

export type ServiceRequestState = { error?: string; ok?: boolean };

const optional = z.string().max(300).optional();

export async function serviceRequestAction(
  _prev: ServiceRequestState,
  formData: FormData,
): Promise<ServiceRequestState> {
  const user = await currentUser();
  const value = (name: string) => {
    const raw = formData.get(name);
    return typeof raw === "string" && raw.trim() ? raw : undefined;
  };

  const parsed = z
    .object({
      kind: z.enum(serviceKinds as [string, ...string[]]),
      contactName: z.string().min(2).max(120),
      email: z.string().email().max(200),
      phone: optional,
      organisationName: optional,
      location: optional,
      message: z.string().max(4000).optional(),
    })
    .safeParse({
      kind: value("kind"),
      contactName: value("contactName"),
      email: value("email"),
      phone: value("phone"),
      organisationName: value("organisationName"),
      location: value("location"),
      message: value("message"),
    });
  if (!parsed.success) return { error: "invalid" };

  const kind = parsed.data.kind as (typeof serviceKinds)[number];
  const details = Object.fromEntries(serviceDetailFields[kind].map((key) => [key, value(key) ?? ""]));

  try {
    await createServiceRequest(user, { ...parsed.data, kind, details });
  } catch (error) {
    if (error instanceof ServiceRequestError) return { error: error.message };
    throw error;
  }

  return { ok: true };
}

export async function updateServiceRequestAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireAdmin(locale);
  const status = z.enum(serviceStatuses as [string, ...string[]]).parse(formData.get("status"));
  await updateServiceRequest(user, String(formData.get("id") ?? ""), {
    status: status as (typeof serviceStatuses)[number],
    adminNote: String(formData.get("adminNote") ?? ""),
  });
  revalidatePath(`/${locale}/admin/anfragen`);
}

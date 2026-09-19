import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { reports } from "@/db/schema/operations";
import type { SessionUser } from "@/auth/session";
import { assert, isAdmin } from "./permissions";
import { recordAudit } from "./audit";

export const reportReasons = [
  "spam",
  "off_platform",
  "misleading",
  "duplicate",
  "prohibited",
  "other",
] as const;
export type ReportReason = (typeof reportReasons)[number];

export type ReportTarget = "listing" | "comment" | "message" | "user";

/**
 * A deliberately simple risk heuristic, enough to order a moderation queue
 * (mockup S19). Real scoring belongs in the production build.
 */
export function riskScore(reason: ReportReason, detail?: string): { score: number; signals: string[] } {
  const signals: string[] = [reason];
  let score = { off_platform: 85, prohibited: 80, misleading: 55, spam: 45, duplicate: 35, other: 25 }[reason];

  const text = (detail ?? "").toLowerCase();
  if (/iban|paypal|western union|bitcoin|krypto/.test(text)) {
    score += 12;
    signals.push("payment_details");
  }
  if (/whatsapp|telegram|signal|direkt per mail/.test(text)) {
    score += 8;
    signals.push("off_platform_contact");
  }
  if (/radioaktiv|isotop|strahlen/.test(text)) {
    score += 15;
    signals.push("hazardous");
  }
  return { score: Math.min(100, score), signals };
}

export async function fileReport(
  user: SessionUser | null,
  input: { targetType: ReportTarget; targetId: string; reason: ReportReason; detail?: string },
) {
  const [row] = await db
    .insert(reports)
    .values({
      reporterId: user?.id ?? null,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      detail: input.detail ?? null,
      riskScore: riskScore(input.reason, input.detail),
    })
    .returning();
  return row!;
}

export async function resolveReport(
  user: SessionUser,
  reportId: string,
  status: "resolved" | "dismissed",
  note?: string,
) {
  assert(isAdmin(user), "Admin only");
  const [before] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
  const [row] = await db
    .update(reports)
    .set({ status, resolvedBy: user.id, resolvedAt: new Date(), resolutionNote: note ?? null })
    .where(eq(reports.id, reportId))
    .returning();
  await recordAudit({
    actorId: user.id,
    action: `report.${status}`,
    targetType: "report",
    targetId: reportId,
    summary: note,
    before: { status: before?.status },
    after: { status },
  });
  return row!;
}

export async function openReportCount() {
  const rows = await db.select({ id: reports.id }).from(reports).where(eq(reports.status, "open"));
  return rows.length;
}

export async function hasReported(userId: string, targetType: ReportTarget, targetId: string) {
  const [row] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(
      and(
        eq(reports.reporterId, userId),
        eq(reports.targetType, targetType),
        eq(reports.targetId, targetId),
      ),
    )
    .limit(1);
  return !!row;
}

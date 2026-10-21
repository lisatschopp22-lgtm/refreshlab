import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organisations } from "@/db/schema/identity";
import { specialRates, type SpecialRate } from "@/db/schema/transactions";
import type { SessionUser } from "@/auth/session";
import { assert, canManageSpecialRates, canRequestSpecialRate } from "./permissions";
import { enqueue, recordAudit } from "./audit";
import { toBasisPoints } from "./fees";

export type FeeSide = "seller" | "buyer";

export class SpecialRateError extends Error {}

/** Selling at a special rate is for dealers only; any organisation may buy at one. */
export function specialRateAllowed(side: FeeSide, organisationType: string) {
  return side === "buyer" || organisationType === "dealer";
}

function rateBpFrom(percent: number) {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new SpecialRateError("invalid_rate");
  return toBasisPoints(percent);
}

async function organisationOf(organisationId: string) {
  const [organisation] = await db
    .select({ id: organisations.id, name: organisations.name, type: organisations.type })
    .from(organisations)
    .where(eq(organisations.id, organisationId))
    .limit(1);
  assert(!!organisation, "Organisation not found");
  return organisation!;
}

async function rateById(id: string) {
  const [row] = await db.select().from(specialRates).where(eq(specialRates.id, id)).limit(1);
  assert(!!row, "Special rate not found");
  return row!;
}

const snapshot = (row: SpecialRate) => ({ status: row.status, rateBp: row.rateBp, decisionNote: row.decisionNote });

export async function requestSpecialRate(
  user: SessionUser,
  organisationId: string,
  input: { side: FeeSide; expectedPerYear?: number | null; message?: string | null },
) {
  assert(canRequestSpecialRate(user, organisationId), "Only the organisation's owner can ask");
  const organisation = await organisationOf(organisationId);
  if (!specialRateAllowed(input.side, organisation.type)) throw new SpecialRateError("not_dealer");

  const open = await db
    .select({ id: specialRates.id })
    .from(specialRates)
    .where(
      and(
        eq(specialRates.organisationId, organisationId),
        eq(specialRates.side, input.side),
        eq(specialRates.status, "requested"),
      ),
    )
    .limit(1);
  if (open.length) throw new SpecialRateError("already_requested");

  const [created] = await db
    .insert(specialRates)
    .values({
      organisationId,
      side: input.side,
      expectedPerYear: input.expectedPerYear ?? null,
      message: input.message?.trim() || null,
      requestedBy: user.id,
    })
    .returning();

  await enqueue("special_rate.requested", { specialRateId: created!.id });
  await recordAudit({
    actorId: user.id,
    action: "special_rate.requested",
    targetType: "organisation",
    targetId: organisationId,
    summary: `${organisation.name} · ${input.side}`,
    after: snapshot(created!),
  });
  return created!;
}

/** Approving or setting a rate ends the one approved before, so only one ever applies. */
async function replaceApproved(
  organisationId: string,
  side: FeeSide,
  write: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0], now: Date) => Promise<SpecialRate>,
) {
  const now = new Date();
  return db.transaction(async (tx) => {
    await tx
      .update(specialRates)
      .set({ status: "ended", endedAt: now })
      .where(
        and(
          eq(specialRates.organisationId, organisationId),
          eq(specialRates.side, side),
          eq(specialRates.status, "approved"),
        ),
      );
    return write(tx, now);
  });
}

export async function approveSpecialRate(user: SessionUser, requestId: string, percent: number, note?: string) {
  assert(canManageSpecialRates(user), "Admin only");
  const before = await rateById(requestId);
  if (before.status !== "requested") throw new SpecialRateError("not_open");
  const organisation = await organisationOf(before.organisationId);
  if (!specialRateAllowed(before.side, organisation.type)) throw new SpecialRateError("not_dealer");
  const rateBp = rateBpFrom(percent);

  const after = await replaceApproved(before.organisationId, before.side, async (tx, now) => {
    const [row] = await tx
      .update(specialRates)
      .set({ status: "approved", rateBp, decidedBy: user.id, decidedAt: now, decisionNote: note?.trim() || null })
      .where(eq(specialRates.id, requestId))
      .returning();
    return row!;
  });

  await recordAudit({
    actorId: user.id,
    action: "special_rate.approved",
    targetType: "organisation",
    targetId: before.organisationId,
    summary: `${organisation.name} · ${before.side} · ${percent} %`,
    before: snapshot(before),
    after: snapshot(after),
  });
  await enqueue("special_rate.decided", { specialRateId: requestId });
  return after;
}

export async function rejectSpecialRate(user: SessionUser, requestId: string, note?: string) {
  assert(canManageSpecialRates(user), "Admin only");
  const before = await rateById(requestId);
  if (before.status !== "requested") throw new SpecialRateError("not_open");
  const organisation = await organisationOf(before.organisationId);

  const [after] = await db
    .update(specialRates)
    .set({ status: "rejected", decidedBy: user.id, decidedAt: new Date(), decisionNote: note?.trim() || null })
    .where(eq(specialRates.id, requestId))
    .returning();

  await recordAudit({
    actorId: user.id,
    action: "special_rate.rejected",
    targetType: "organisation",
    targetId: before.organisationId,
    summary: `${organisation.name} · ${before.side}`,
    before: snapshot(before),
    after: snapshot(after!),
  });
  await enqueue("special_rate.decided", { specialRateId: requestId });
  return after!;
}

/** An admin sets a rate without a request, for example after a negotiation. */
export async function grantSpecialRate(
  user: SessionUser,
  organisationId: string,
  side: FeeSide,
  percent: number,
  note?: string,
) {
  assert(canManageSpecialRates(user), "Admin only");
  const organisation = await organisationOf(organisationId);
  if (!specialRateAllowed(side, organisation.type)) throw new SpecialRateError("not_dealer");
  const rateBp = rateBpFrom(percent);

  const created = await replaceApproved(organisationId, side, async (tx, now) => {
    const [row] = await tx
      .insert(specialRates)
      .values({
        organisationId,
        side,
        status: "approved",
        rateBp,
        decidedBy: user.id,
        decidedAt: now,
        decisionNote: note?.trim() || null,
      })
      .returning();
    return row!;
  });

  await recordAudit({
    actorId: user.id,
    action: "special_rate.granted",
    targetType: "organisation",
    targetId: organisationId,
    summary: `${organisation.name} · ${side} · ${percent} %`,
    after: snapshot(created),
  });
  return created;
}

export async function changeSpecialRate(user: SessionUser, rateId: string, percent: number, note?: string) {
  assert(canManageSpecialRates(user), "Admin only");
  const before = await rateById(rateId);
  if (before.status !== "approved") throw new SpecialRateError("not_approved");
  const organisation = await organisationOf(before.organisationId);
  const rateBp = rateBpFrom(percent);

  const [after] = await db
    .update(specialRates)
    .set({
      rateBp,
      decidedBy: user.id,
      decidedAt: new Date(),
      decisionNote: note?.trim() || before.decisionNote,
    })
    .where(eq(specialRates.id, rateId))
    .returning();

  await recordAudit({
    actorId: user.id,
    action: "special_rate.changed",
    targetType: "organisation",
    targetId: before.organisationId,
    summary: `${organisation.name} · ${before.side} · ${percent} %`,
    before: snapshot(before),
    after: snapshot(after!),
  });
  return after!;
}

export async function endSpecialRate(user: SessionUser, rateId: string, note?: string) {
  assert(canManageSpecialRates(user), "Admin only");
  const before = await rateById(rateId);
  if (before.status !== "approved") throw new SpecialRateError("not_approved");
  const organisation = await organisationOf(before.organisationId);

  const [after] = await db
    .update(specialRates)
    .set({ status: "ended", endedAt: new Date(), decisionNote: note?.trim() || before.decisionNote })
    .where(eq(specialRates.id, rateId))
    .returning();

  await recordAudit({
    actorId: user.id,
    action: "special_rate.ended",
    targetType: "organisation",
    targetId: before.organisationId,
    summary: `${organisation.name} · ${before.side}`,
    before: snapshot(before),
    after: snapshot(after!),
  });
  return after!;
}

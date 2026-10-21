import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, ratings, type Order, type Rating } from "@/db/schema/transactions";
import type { SessionUser } from "@/auth/session";
import { assert, canModerateRatings, ratingSideOf } from "./permissions";
import { enqueue, recordAudit } from "./audit";
import { flags as readFlags } from "./settings";

export type RatingSide = "buyer" | "seller";

/** How long after a completed deal both sides may rate. */
export const RATING_PERIOD_DAYS = 14;

export class RatingError extends Error {}

export function ratingPeriodEnds(order: Pick<Order, "completedAt">): Date | null {
  if (!order.completedAt) return null;
  return new Date(order.completedAt.getTime() + RATING_PERIOD_DAYS * 86_400_000);
}

export function ratingOpen(order: Pick<Order, "status" | "completedAt">, now = new Date()) {
  const ends = ratingPeriodEnds(order);
  return order.status === "completed" && !!ends && now < ends;
}

/**
 * Whether a rating may be read by the side it is about. Revealed together, a
 * rating waits until the other side has rated as well or the period has
 * ended, so nobody rates in reaction to the rating they received.
 */
export function ratingRevealed(input: {
  together: boolean;
  otherSideRated: boolean;
  periodEnds: Date | null;
  now?: Date;
}) {
  if (!input.together || input.otherSideRated) return true;
  return !!input.periodEnds && (input.now ?? new Date()) >= input.periodEnds;
}

/** "Anna Iten" becomes "Anna I.": a buyer never chose to be named in public. */
export function shortName(displayName: string) {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length < 2) return displayName.trim();
  return `${parts[0]} ${parts[parts.length - 1]!.charAt(0)}.`;
}

const otherSide = (side: RatingSide): RatingSide => (side === "buyer" ? "seller" : "buyer");

export async function submitRating(
  user: SessionUser,
  orderId: string,
  input: { score: number; comment?: string | null },
) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  assert(!!order, "Order not found");
  const side = ratingSideOf(user, order!);
  assert(!!side, "Not a party to this deal");
  if (!ratingOpen(order!)) throw new RatingError("closed");
  if (!Number.isInteger(input.score) || input.score < 1 || input.score > 5) throw new RatingError("invalid");

  const [created] = await db
    .insert(ratings)
    .values({
      orderId: order!.id,
      side: side!,
      raterId: user.id,
      // The buyer rates whoever the listing showed as the seller, the organisation included.
      rateeProfileId: side === "buyer" ? order!.sellerId : order!.buyerId,
      rateeOrgId: side === "buyer" ? order!.sellerOrgId : null,
      score: input.score,
      comment: input.comment?.trim() || null,
    })
    .onConflictDoNothing()
    .returning();
  if (!created) throw new RatingError("already_rated");

  await enqueue("rating.created", { ratingId: created.id });
  await recordAudit({
    actorId: user.id,
    action: "rating.created",
    targetType: "order",
    targetId: order!.id,
    summary: `${order!.reference} · ${side} · ${created.score}/5`,
    after: { side, score: created.score },
  });
  return created;
}

/** An admin takes a rating out of view, for abuse or personal details, or puts it back. */
export async function setRatingHidden(user: SessionUser, ratingId: string, hidden: boolean, reason?: string) {
  assert(canModerateRatings(user), "Admin only");
  const [before] = await db.select().from(ratings).where(eq(ratings.id, ratingId)).limit(1);
  assert(!!before, "Rating not found");

  const [after] = await db
    .update(ratings)
    .set(hidden ? { hiddenAt: new Date(), hiddenReason: reason?.trim() || null } : { hiddenAt: null, hiddenReason: null })
    .where(eq(ratings.id, ratingId))
    .returning();

  await recordAudit({
    actorId: user.id,
    action: hidden ? "rating.hidden" : "rating.shown",
    targetType: "rating",
    targetId: ratingId,
    summary: reason?.trim() || undefined,
    before: { hiddenAt: before!.hiddenAt, hiddenReason: before!.hiddenReason },
    after: { hiddenAt: after!.hiddenAt, hiddenReason: after!.hiddenReason },
  });
  return after!;
}

export type OrderRatings = {
  /** The viewer's side, or null for an admin looking on. */
  side: RatingSide | null;
  open: boolean;
  periodEnds: Date | null;
  together: boolean;
  mine: Rating | null;
  /** The other side's rating of the viewer, once it may be read. */
  theirs: Rating | null;
  theirsState: "none" | "waiting" | "hidden" | "shown";
  /** Both ratings, for moderation. */
  all: Rating[];
};

export async function orderRatings(user: SessionUser, order: Order): Promise<OrderRatings> {
  const [rows, flags] = await Promise.all([
    db
      .select()
      .from(ratings)
      .where(and(eq(ratings.orderId, order.id), isNull(ratings.deletedAt))),
    readFlags(),
  ]);
  const side = ratingSideOf(user, order);
  const periodEnds = ratingPeriodEnds(order);
  const mine = side ? (rows.find((row) => row.side === side) ?? null) : null;
  const other = side ? (rows.find((row) => row.side === otherSide(side)) ?? null) : null;
  const revealed = ratingRevealed({ together: flags.ratingsRevealTogether, otherSideRated: !!mine, periodEnds });

  const theirsState = !other ? "none" : !revealed ? "waiting" : other.hiddenAt ? "hidden" : "shown";

  return {
    side,
    open: ratingOpen(order),
    periodEnds,
    together: flags.ratingsRevealTogether,
    mine,
    theirs: theirsState === "shown" ? other : null,
    theirsState,
    all: canModerateRatings(user) ? rows : [],
  };
}

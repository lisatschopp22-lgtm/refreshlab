import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { organisations, profiles } from "@/db/schema/identity";
import { listings } from "@/db/schema/marketplace";
import { offers, orders, paymentEvents } from "@/db/schema/transactions";
import type { SessionUser } from "@/auth/session";
import { assert, canActAsBuyer, canActAsSeller, canViewOrder, isAdmin } from "./permissions";
import { enqueue, recordAudit } from "./audit";
import { calculateFees, sellerNetCents } from "./fees";
import { feePartiesFor } from "./fee-standing";
import { feeRule } from "./settings";
import { flags as readFlags } from "./settings";

export type OrderStatus = (typeof orders.$inferSelect)["status"];
export type Actor = "buyer" | "seller" | "admin" | "system";

export class OrderError extends Error {}

/**
 * The transaction flow from the requirements: offer → payment → shipping →
 * check → payout, with cancellation, dispute and refund branches. Who may
 * make each move is part of the machine, not of the UI.
 */
export const orderTransitions: Record<OrderStatus, { to: OrderStatus; by: Actor[] }[]> = {
  pending_payment: [
    { to: "paid", by: ["buyer", "system", "admin"] },
    { to: "cancelled", by: ["buyer", "seller", "admin"] },
  ],
  paid: [
    { to: "shipped", by: ["seller", "admin"] },
    { to: "disputed", by: ["buyer", "admin"] },
    { to: "refunded", by: ["admin"] },
    { to: "cancelled", by: ["admin"] },
  ],
  shipped: [
    { to: "delivered", by: ["buyer", "seller", "admin"] },
    { to: "disputed", by: ["buyer", "admin"] },
  ],
  delivered: [
    { to: "completed", by: ["buyer", "admin"] },
    { to: "disputed", by: ["buyer", "admin"] },
  ],
  disputed: [
    { to: "completed", by: ["admin"] },
    { to: "refunded", by: ["admin"] },
    { to: "cancelled", by: ["admin"] },
  ],
  completed: [],
  cancelled: [],
  refunded: [],
};

export function canMove(from: OrderStatus, to: OrderStatus, actor: Actor) {
  return orderTransitions[from].some((step) => step.to === to && step.by.includes(actor));
}

export function nextStatuses(from: OrderStatus, actor: Actor) {
  return orderTransitions[from].filter((step) => step.by.includes(actor)).map((step) => step.to);
}

/** Which milestone of the five-step bar a status sits on (mockup S10). */
export function milestoneIndex(status: OrderStatus): number {
  switch (status) {
    case "pending_payment":
      return 1;
    case "paid":
      return 2;
    case "shipped":
      return 3;
    case "delivered":
    case "disputed":
      return 4;
    case "completed":
    case "refunded":
      return 5;
    default:
      return 0;
  }
}

async function nextReference() {
  const rows = await db.execute<{ next: string }>(
    sql`select 'RL-' || to_char(now(), 'YYYY') || '-' || lpad((1000 + count(*))::text, 4, '0') as next from ${orders}`,
  );
  return (rows as unknown as { next: string }[])[0]?.next ?? `RL-${Date.now()}`;
}

export async function createOrder(
  user: SessionUser,
  input: { listingId: string; offerId?: string; amountCents?: number },
) {
  const [listing] = await db.select().from(listings).where(eq(listings.id, input.listingId)).limit(1);
  assert(!!listing, "Listing not found");
  if (listing!.status !== "active") throw new OrderError("not_available");
  if (listing!.sellerProfileId === user.id) throw new OrderError("own_listing");

  let amountCents = input.amountCents ?? listing!.priceCents;

  if (input.offerId) {
    const [offer] = await db.select().from(offers).where(eq(offers.id, input.offerId)).limit(1);
    assert(!!offer, "Offer not found");
    if (offer!.status !== "accepted") throw new OrderError("offer_not_accepted");
    if (offer!.buyerId !== user.id) throw new OrderError("not_your_offer");
    amountCents = offer!.amountCents;
  } else if (!(await readFlags()).buyNowEnabled) {
    throw new OrderError("buy_now_disabled");
  } else if (listing!.negotiable === "offer") {
    throw new OrderError("offers_only");
  }

  // The rates depend on how much each side has traded and on special rates.
  const parties = await feePartiesFor(
    { profileId: listing!.sellerProfileId, organisationId: listing!.sellerOrgId },
    { id: user.id, organisationIds: user.organisations.map((o) => o.id) },
  );
  const fees = calculateFees(amountCents, listing!.currency, await feeRule(), parties);
  const reference = await nextReference();

  const [order] = await db.transaction(async (tx) => {
    const created = await tx
      .insert(orders)
      .values({
        reference,
        listingId: listing!.id,
        offerId: input.offerId ?? null,
        buyerId: user.id,
        sellerId: listing!.sellerProfileId,
        sellerOrgId: listing!.sellerOrgId,
        amountCents,
        sellerFeeCents: fees.seller.cents,
        buyerFeeCents: fees.buyer.cents,
        sellerFeeBp: fees.sellerBp,
        buyerFeeBp: fees.buyerBp,
        buyerOrgId: parties.buyerOrgId,
        currency: listing!.currency,
        status: "pending_payment",
        paymentProvider: process.env.PAYMENT_PROVIDER ?? "fake",
      })
      .returning();

    // The unit is off the market while the buyer pays.
    await tx.update(listings).set({ status: "reserved" }).where(eq(listings.id, listing!.id));
    return created;
  });

  await enqueue("listing.reindex", { listingId: listing!.id });
  await recordAudit({
    actorId: user.id,
    action: "order.created",
    targetType: "order",
    targetId: order!.id,
    summary: `${reference} · ${listing!.title}`,
  });
  return order!;
}

export async function getOrder(user: SessionUser, orderId: string) {
  const [row] = await db
    .select({
      order: orders,
      listingSlug: listings.slug,
      listingTitle: listings.title,
      buyerName: sql<string>`(select display_name from profiles where id = ${orders.buyerId})`,
      sellerName: sql<string>`(select display_name from profiles where id = ${orders.sellerId})`,
      sellerOrgName: organisations.name,
      buyerOrgName: sql<string | null>`(select name from organisations where id = ${orders.buyerOrgId})`,
    })
    .from(orders)
    .innerJoin(listings, eq(listings.id, orders.listingId))
    .leftJoin(organisations, eq(organisations.id, orders.sellerOrgId))
    .where(eq(orders.id, orderId))
    .limit(1);

  assert(!!row, "Order not found");
  assert(canViewOrder(user, row!.order), "Not your transaction");

  const events = await db
    .select()
    .from(paymentEvents)
    .where(eq(paymentEvents.orderId, orderId))
    .orderBy(paymentEvents.createdAt);

  return { ...row!, events };
}

export function actorFor(user: SessionUser, order: typeof orders.$inferSelect): Actor {
  if (canActAsBuyer(user, order) && order.buyerId === user.id) return "buyer";
  if (canActAsSeller(user, order) && order.sellerId === user.id) return "seller";
  if (isAdmin(user)) return "admin";
  return "system";
}

export async function moveOrder(
  user: SessionUser,
  orderId: string,
  to: OrderStatus,
  detail?: { trackingReference?: string; reason?: string; note?: string; refundCents?: number },
) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  assert(!!order, "Order not found");
  assert(canViewOrder(user, order!), "Not your transaction");

  // An admin may always act; otherwise the party's own role decides.
  const actor: Actor =
    order!.buyerId === user.id ? "buyer" : order!.sellerId === user.id ? "seller" : isAdmin(user) ? "admin" : "system";
  const effective = canMove(order!.status, to, actor) ? actor : isAdmin(user) ? "admin" : actor;
  if (!canMove(order!.status, to, effective)) throw new OrderError("invalid_transition");

  const now = new Date();
  const patch: Partial<typeof orders.$inferInsert> = { status: to };

  if (to === "paid") patch.paidAt = now;
  if (to === "shipped") {
    patch.shippedAt = now;
    if (detail?.trackingReference) patch.trackingReference = detail.trackingReference;
  }
  if (to === "delivered") patch.deliveredAt = now;
  if (to === "completed") {
    patch.completedAt = now;
    // Confirming receipt is what releases the money. Stripe is not an escrow,
    // so this is a marketplace rule, not a banking one.
    patch.payoutReleasedAt = now;
  }
  if (to === "cancelled") patch.cancelledAt = now;
  if (to === "disputed") {
    patch.disputeOpenedAt = now;
    patch.disputeReason = detail?.reason ?? null;
  }
  if (to === "refunded") {
    // A full refund returns everything the buyer paid, their share of the fee included.
    patch.refundedCents = detail?.refundCents ?? orderTotals(order!).totalCents;
    patch.disputeResolution = detail?.note ?? null;
  }
  if (to === "completed" && order!.status === "disputed") {
    patch.disputeResolution = detail?.note ?? null;
  }

  const [updated] = await db.transaction(async (tx) => {
    const result = await tx.update(orders).set(patch).where(eq(orders.id, orderId)).returning();

    // The listing follows the transaction: sold when it completes, back on the
    // market when it does not.
    if (to === "completed") {
      await tx.update(listings).set({ status: "sold" }).where(eq(listings.id, order!.listingId));
    }
    if (to === "cancelled" || to === "refunded") {
      await tx
        .update(listings)
        .set({ status: "active" })
        .where(and(eq(listings.id, order!.listingId), eq(listings.status, "reserved")));
    }
    return result;
  });

  await enqueue("listing.reindex", { listingId: order!.listingId });
  await enqueue("order.updated", { orderId });
  await recordAudit({
    actorId: user.id,
    action: `order.${to}`,
    targetType: "order",
    targetId: orderId,
    summary: detail?.reason ?? detail?.note ?? undefined,
    before: { status: order!.status },
    after: { status: to },
  });

  return updated!;
}

export async function ordersForUser(userId: string) {
  const rows = await db
    .select({
      order: orders,
      listingSlug: listings.slug,
      listingTitle: listings.title,
      counterpartName: sql<string>`(
        select display_name from profiles
        where id = case when ${orders.buyerId} = ${userId} then ${orders.sellerId} else ${orders.buyerId} end
      )`,
    })
    .from(orders)
    .innerJoin(listings, eq(listings.id, orders.listingId))
    .where(sql`${orders.buyerId} = ${userId} or ${orders.sellerId} = ${userId}`)
    .orderBy(desc(orders.createdAt));

  return {
    buying: rows.filter((row) => row.order.buyerId === userId),
    selling: rows.filter((row) => row.order.sellerId === userId),
  };
}

export function orderTotals(order: typeof orders.$inferSelect) {
  return {
    itemCents: order.amountCents,
    shippingCents: order.shippingCents,
    buyerFeeCents: order.buyerFeeCents,
    sellerFeeCents: order.sellerFeeCents,
    /** What the buyer pays. */
    totalCents: order.amountCents + order.shippingCents + order.buyerFeeCents,
    sellerNetCents: sellerNetCents(order.amountCents, order.sellerFeeCents),
  };
}

export async function invoiceData(user: SessionUser, orderId: string) {
  const data = await getOrder(user, orderId);
  const [buyer] = await db
    .select({ displayName: profiles.displayName, email: profiles.email, city: profiles.city })
    .from(profiles)
    .where(eq(profiles.id, data.order.buyerId))
    .limit(1);
  const [seller] = await db
    .select({ displayName: profiles.displayName, email: profiles.email, city: profiles.city })
    .from(profiles)
    .where(eq(profiles.id, data.order.sellerId))
    .limit(1);
  return { ...data, buyer, seller, totals: orderTotals(data.order) };
}

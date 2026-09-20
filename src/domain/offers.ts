import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations, conversationParticipants, messages } from "@/db/schema/community";
import { listings } from "@/db/schema/marketplace";
import { offers } from "@/db/schema/transactions";
import type { SessionUser } from "@/auth/session";
import { assert, canActAsSeller, canOfferOn } from "./permissions";
import { enqueue, recordAudit } from "./audit";
import { flags as readFlags } from "./settings";

export type OfferStatus = (typeof offers.$inferSelect)["status"];

export class OfferError extends Error {}

/** Who may move an offer from one state to the next. */
const transitions: Record<OfferStatus, { to: OfferStatus; by: "buyer" | "seller" | "system" }[]> = {
  open: [
    { to: "accepted", by: "seller" },
    { to: "rejected", by: "seller" },
    { to: "countered", by: "seller" },
    { to: "withdrawn", by: "buyer" },
    { to: "expired", by: "system" },
  ],
  countered: [
    { to: "accepted", by: "buyer" },
    { to: "rejected", by: "buyer" },
    { to: "expired", by: "system" },
  ],
  accepted: [],
  rejected: [],
  expired: [],
  withdrawn: [],
};

export function canTransition(from: OfferStatus, to: OfferStatus, by: "buyer" | "seller" | "system") {
  return transitions[from].some((step) => step.to === to && step.by === by);
}

export const OFFER_VALIDITY_DAYS = 7;

export async function makeOffer(
  user: SessionUser,
  input: { listingId: string; amountCents: number; message?: string },
) {
  assert((await readFlags()).offersEnabled, "Offers are disabled");

  const [listing] = await db.select().from(listings).where(eq(listings.id, input.listingId)).limit(1);
  assert(!!listing, "Listing not found");
  if (listing!.status !== "active") throw new OfferError("not_available");
  if (listing!.negotiable === "fixed") throw new OfferError("fixed_price");
  if (!canOfferOn(user, listing!)) throw new OfferError("own_listing");
  if (input.amountCents <= 0) throw new OfferError("invalid_amount");
  if (input.amountCents > listing!.priceCents * 2) throw new OfferError("invalid_amount");

  // A minimum price is never shown, but an offer below it is refused at once
  // rather than left hanging.
  if (listing!.minPriceCents && input.amountCents < listing!.minPriceCents) {
    throw new OfferError("below_minimum");
  }

  const [row] = await db
    .insert(offers)
    .values({
      listingId: listing!.id,
      buyerId: user.id,
      sellerId: listing!.sellerProfileId,
      amountCents: input.amountCents,
      currency: listing!.currency,
      message: input.message?.trim() || null,
      status: "open",
      createdByRole: "buyer",
      expiresAt: new Date(Date.now() + OFFER_VALIDITY_DAYS * 86_400_000),
    })
    .returning();

  await enqueue("offer.received", { offerId: row!.id, listingId: listing!.id });
  return row!;
}

async function loadOffer(offerId: string) {
  const [row] = await db.select().from(offers).where(eq(offers.id, offerId)).limit(1);
  assert(!!row, "Offer not found");
  return row!;
}

function roleOf(user: SessionUser, offer: typeof offers.$inferSelect): "buyer" | "seller" | null {
  if (offer.buyerId === user.id) return "buyer";
  if (canActAsSeller(user, { sellerId: offer.sellerId })) return "seller";
  return null;
}

export async function respondToOffer(
  user: SessionUser,
  offerId: string,
  to: OfferStatus,
  counterAmountCents?: number,
) {
  const offer = await loadOffer(offerId);
  const role = roleOf(user, offer);
  if (!role) throw new OfferError("not_a_party");
  if (offer.expiresAt < new Date() && offer.status === "open") throw new OfferError("expired");
  if (!canTransition(offer.status, to, role)) throw new OfferError("invalid_transition");

  if (to === "countered") {
    if (!counterAmountCents || counterAmountCents <= 0) throw new OfferError("invalid_amount");

    const [counter] = await db.transaction(async (tx) => {
      await tx
        .update(offers)
        .set({ status: "countered", respondedAt: new Date() })
        .where(eq(offers.id, offerId));
      return tx
        .insert(offers)
        .values({
          listingId: offer.listingId,
          buyerId: offer.buyerId,
          sellerId: offer.sellerId,
          amountCents: counterAmountCents,
          currency: offer.currency,
          status: "countered",
          parentOfferId: offer.id,
          createdByRole: "seller",
          expiresAt: new Date(Date.now() + OFFER_VALIDITY_DAYS * 86_400_000),
        })
        .returning();
    });

    await recordAudit({
      actorId: user.id,
      action: "offer.countered",
      targetType: "offer",
      targetId: offerId,
      before: { amountCents: offer.amountCents },
      after: { amountCents: counterAmountCents },
    });
    return counter!;
  }

  const [row] = await db
    .update(offers)
    .set({ status: to, respondedAt: new Date() })
    .where(eq(offers.id, offerId))
    .returning();

  await recordAudit({
    actorId: user.id,
    action: `offer.${to}`,
    targetType: "offer",
    targetId: offerId,
    before: { status: offer.status },
    after: { status: to },
  });

  return row!;
}

/** Offers past their validity date, swept when the offer lists are read. */
export async function expireStaleOffers() {
  const rows = await db
    .update(offers)
    .set({ status: "expired" })
    .where(and(inArray(offers.status, ["open", "countered"]), lt(offers.expiresAt, new Date())))
    .returning({ id: offers.id });
  return rows.length;
}

export async function offersForUser(userId: string) {
  await expireStaleOffers();

  const rows = await db
    .select({
      offer: offers,
      listingSlug: listings.slug,
      listingTitle: listings.title,
      listingPriceCents: listings.priceCents,
      listingStatus: listings.status,
      sellerProfileId: listings.sellerProfileId,
    })
    .from(offers)
    .innerJoin(listings, eq(listings.id, offers.listingId))
    .where(sql`${offers.buyerId} = ${userId} or ${offers.sellerId} = ${userId}`)
    .orderBy(desc(offers.createdAt));

  return {
    incoming: rows.filter((row) => row.offer.sellerId === userId),
    outgoing: rows.filter((row) => row.offer.buyerId === userId),
  };
}

/** Mirrors an offer event into the thread, so negotiation stays in one place (mockup S9). */
export async function noteOfferInConversation(
  user: SessionUser,
  offerId: string,
  body: string,
) {
  const offer = await loadOffer(offerId);
  const [conversation] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.listingId, offer.listingId))
    .limit(1);

  let conversationId = conversation?.id;
  if (!conversationId) {
    const [created] = await db
      .insert(conversations)
      .values({ listingId: offer.listingId, createdBy: user.id })
      .returning({ id: conversations.id });
    conversationId = created!.id;
    await db.insert(conversationParticipants).values([
      { conversationId, profileId: offer.buyerId },
      { conversationId, profileId: offer.sellerId },
    ]);
  }

  await db.insert(messages).values({
    conversationId,
    senderId: user.id,
    body,
    offerId,
  });
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, specialRates } from "@/db/schema/transactions";
import type { FeeParty } from "./fees";
import type { FeeSide } from "./special-rates";

export type SellerRef = { profileId: string; organisationId: string | null };

/** Completed sales of a seller: an organisation's, or a person's own outside any organisation. */
export async function completedSales(seller: SellerRef): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        eq(orders.status, "completed"),
        seller.organisationId
          ? eq(orders.sellerOrgId, seller.organisationId)
          : and(eq(orders.sellerId, seller.profileId), isNull(orders.sellerOrgId)),
      ),
    );
  return row?.count ?? 0;
}

export async function completedPurchases(profileId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.status, "completed"), eq(orders.buyerId, profileId)));
  return row?.count ?? 0;
}

/** The approved special rates of these organisations on one side, lowest first. */
export async function approvedRates(organisationIds: string[], side: FeeSide) {
  if (!organisationIds.length) return [];
  const rows = await db
    .select({ organisationId: specialRates.organisationId, rateBp: specialRates.rateBp })
    .from(specialRates)
    .where(
      and(
        inArray(specialRates.organisationId, organisationIds),
        eq(specialRates.side, side),
        eq(specialRates.status, "approved"),
      ),
    )
    .orderBy(asc(specialRates.rateBp));
  return rows.filter((row): row is { organisationId: string; rateBp: number } => row.rateBp !== null);
}

/**
 * Everything the fee of a deal depends on. The seller sells as the listing's
 * organisation or privately. The buyer buys for the organisation with the best
 * special buying rate among those they belong to, otherwise privately.
 */
export async function feePartiesFor(
  seller: SellerRef,
  buyer?: { id: string; organisationIds: string[] },
): Promise<{ seller: FeeParty; buyer: FeeParty; buyerOrgId: string | null }> {
  const [sales, sellerRates, purchases, buyerRates] = await Promise.all([
    completedSales(seller),
    seller.organisationId ? approvedRates([seller.organisationId], "seller") : Promise.resolve([]),
    buyer ? completedPurchases(buyer.id) : Promise.resolve(0),
    buyer ? approvedRates(buyer.organisationIds, "buyer") : Promise.resolve([]),
  ]);
  const buyingFor = buyerRates[0] ?? null;
  return {
    seller: { completed: sales, specialRateBp: sellerRates[0]?.rateBp ?? null },
    buyer: { completed: purchases, specialRateBp: buyingFor?.rateBp ?? null },
    buyerOrgId: buyingFor?.organisationId ?? null,
  };
}

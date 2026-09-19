import { and, count, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { equipmentModels, manufacturers } from "@/db/schema/catalogue";
import { conversationParticipants, conversations, messages } from "@/db/schema/community";
import { organisations } from "@/db/schema/identity";
import { listingImages, listings, savedSearches, watchlist } from "@/db/schema/marketplace";
import { offers, orders } from "@/db/schema/transactions";

export async function dashboardSummary(userId: string, organisationIds: string[]) {
  const ownScope = organisationIds.length
    ? sql`(${listings.sellerProfileId} = ${userId} or ${listings.sellerOrgId} in ${organisationIds})`
    : eq(listings.sellerProfileId, userId);

  const [listingCounts] = await db
    .select({
      active: sql<number>`count(*) filter (where status = 'active')::int`,
      draft: sql<number>`count(*) filter (where status = 'draft')::int`,
      pending: sql<number>`count(*) filter (where status = 'pending_review')::int`,
      sold: sql<number>`count(*) filter (where status = 'sold')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(listings)
    .where(and(ownScope, isNull(listings.deletedAt)));

  const [unread] = await db
    .select({
      value: sql<number>`count(*)::int`,
    })
    .from(messages)
    .innerJoin(conversationParticipants, eq(conversationParticipants.conversationId, messages.conversationId))
    .where(
      and(
        eq(conversationParticipants.profileId, userId),
        ne(messages.senderId, userId),
        isNull(messages.deletedAt),
        sql`(${conversationParticipants.lastReadAt} is null or ${messages.createdAt} > ${conversationParticipants.lastReadAt})`,
      ),
    );

  const [offerCounts] = await db
    .select({
      incoming: sql<number>`count(*) filter (where seller_id = ${userId} and status in ('open','countered'))::int`,
      outgoing: sql<number>`count(*) filter (where buyer_id = ${userId} and status in ('open','countered'))::int`,
    })
    .from(offers);

  const [orderCounts] = await db
    .select({
      buying: sql<number>`count(*) filter (where buyer_id = ${userId} and status not in ('completed','cancelled','refunded'))::int`,
      selling: sql<number>`count(*) filter (where seller_id = ${userId} and status not in ('completed','cancelled','refunded'))::int`,
    })
    .from(orders);

  const [watched] = await db
    .select({ value: count() })
    .from(watchlist)
    .where(eq(watchlist.profileId, userId));

  const searches = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.profileId, userId))
    .orderBy(desc(savedSearches.createdAt));

  return {
    listings: listingCounts ?? { active: 0, draft: 0, pending: 0, sold: 0, total: 0 },
    unreadMessages: Number(unread?.value ?? 0),
    offers: offerCounts ?? { incoming: 0, outgoing: 0 },
    orders: orderCounts ?? { buying: 0, selling: 0 },
    watchlist: Number(watched?.value ?? 0),
    savedSearches: searches,
  };
}

export async function myListings(userId: string, organisationIds: string[], status?: string) {
  const scope = organisationIds.length
    ? sql`(${listings.sellerProfileId} = ${userId} or ${listings.sellerOrgId} in ${organisationIds})`
    : eq(listings.sellerProfileId, userId);

  return db
    .select({
      id: listings.id,
      slug: listings.slug,
      reference: listings.reference,
      title: listings.title,
      status: listings.status,
      priceCents: listings.priceCents,
      currency: listings.currency,
      condition: listings.condition,
      viewCount: listings.viewCount,
      publishedAt: listings.publishedAt,
      updatedAt: listings.updatedAt,
      locationCity: listings.locationCity,
      organisationName: organisations.name,
      modelName: equipmentModels.name,
      manufacturerName: manufacturers.name,
      imagePath: sql<string | null>`(
        select storage_path from ${listingImages} where listing_id = "listings"."id"
        order by sort_order limit 1
      )`,
      offerCount: sql<number>`(
        select count(*)::int from ${offers}
        where listing_id = "listings"."id" and status in ('open','countered')
      )`,
    })
    .from(listings)
    .innerJoin(equipmentModels, eq(equipmentModels.id, listings.modelId))
    .innerJoin(manufacturers, eq(manufacturers.id, equipmentModels.manufacturerId))
    .leftJoin(organisations, eq(organisations.id, listings.sellerOrgId))
    .where(
      and(
        scope,
        isNull(listings.deletedAt),
        status ? eq(listings.status, status as typeof listings.$inferSelect.status) : undefined,
      ),
    )
    .orderBy(desc(listings.updatedAt));
}

export async function myWatchlist(userId: string) {
  const rows = await db
    .select({ listingId: watchlist.listingId })
    .from(watchlist)
    .where(eq(watchlist.profileId, userId));
  if (!rows.length) return [];

  return db
    .select({
      id: listings.id,
      slug: listings.slug,
      title: listings.title,
      priceCents: listings.priceCents,
      currency: listings.currency,
      condition: listings.condition,
      status: listings.status,
      locationCity: listings.locationCity,
      year: listings.year,
      imagePath: sql<string | null>`(
        select storage_path from ${listingImages} where listing_id = "listings"."id"
        order by sort_order limit 1
      )`,
    })
    .from(listings)
    .where(and(inArray(listings.id, rows.map((r) => r.listingId)), isNull(listings.deletedAt)));
}

export async function conversationsFor(userId: string) {
  return db
    .select({
      id: conversations.id,
      subject: conversations.subject,
      listingId: conversations.listingId,
      listingSlug: listings.slug,
      listingTitle: listings.title,
      listingImage: sql<string | null>`(
        select storage_path from ${listingImages} where listing_id = ${conversations.listingId}
        order by sort_order limit 1
      )`,
      lastMessageAt: conversations.lastMessageAt,
      lastReadAt: conversationParticipants.lastReadAt,
      unread: sql<number>`(
        select count(*)::int from ${messages} m
        where m.conversation_id = ${conversations.id}
          and m.sender_id <> ${userId}
          and m.deleted_at is null
          and (${conversationParticipants.lastReadAt} is null or m.created_at > ${conversationParticipants.lastReadAt})
      )`,
      preview: sql<string | null>`(
        select body from ${messages} m
        where m.conversation_id = ${conversations.id} and m.deleted_at is null
        order by m.created_at desc limit 1
      )`,
      counterpartName: sql<string>`(
        select p.display_name from conversation_participants cp
        join profiles p on p.id = cp.profile_id
        where cp.conversation_id = ${conversations.id} and cp.profile_id <> ${userId}
        limit 1
      )`,
    })
    .from(conversations)
    .innerJoin(
      conversationParticipants,
      and(
        eq(conversationParticipants.conversationId, conversations.id),
        eq(conversationParticipants.profileId, userId),
      ),
    )
    .leftJoin(listings, eq(listings.id, conversations.listingId))
    .orderBy(desc(conversations.lastMessageAt));
}

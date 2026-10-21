import { and, asc, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, equipmentModels, manufacturers } from "@/db/schema/catalogue";
import { comments, messages } from "@/db/schema/community";
import { organisationMembers, organisations, profiles } from "@/db/schema/identity";
import { listings } from "@/db/schema/marketplace";
import { auditLog, contentPages, outbox, reports } from "@/db/schema/operations";
import { qualified } from "./sql-helpers";
import type { Localized } from "@/db/schema/common";
import { offers, orders } from "@/db/schema/transactions";

export async function adminOverview() {
  const [row] = await db
    .select({
      activeListings: sql<number>`(select count(*)::int from ${listings} where status = 'active' and deleted_at is null)`,
      pendingListings: sql<number>`(select count(*)::int from ${listings} where status = 'pending_review')`,
      users: sql<number>`(select count(*)::int from ${profiles})`,
      suspendedUsers: sql<number>`(select count(*)::int from ${profiles} where suspended_at is not null)`,
      organisations: sql<number>`(select count(*)::int from ${organisations})`,
      openReports: sql<number>`(select count(*)::int from ${reports} where status = 'open')`,
      highRiskReports: sql<number>`(select count(*)::int from ${reports} where status = 'open' and (risk_score ->> 'score')::int >= 80)`,
      openOrders: sql<number>`(select count(*)::int from ${orders} where status not in ('completed','cancelled','refunded'))`,
      disputes: sql<number>`(select count(*)::int from ${orders} where status = 'disputed')`,
      gmvCents: sql<number>`(select coalesce(sum(amount_cents), 0)::bigint from ${orders} where status = 'completed')`,
      feeCents: sql<number>`(select coalesce(sum(fee_cents + buyer_fee_cents), 0)::bigint from ${orders} where status = 'completed')`,
      pendingModels: sql<number>`(select count(*)::int from ${equipmentModels} where status = 'pending')`,
      openOffers: sql<number>`(select count(*)::int from ${offers} where status in ('open','countered'))`,
      deadLetters: sql<number>`(select count(*)::int from ${outbox} where processed_at is null and (attempts ->> 'count')::int >= 3)`,
    })
    .from(sql`(select 1) as one`);
  return row!;
}

/** The moderation queue of mockup S19, ordered by risk. */
export async function moderationQueue(limit = 50) {
  return db
    .select({
      id: reports.id,
      targetType: reports.targetType,
      targetId: reports.targetId,
      reason: reports.reason,
      detail: reports.detail,
      riskScore: reports.riskScore,
      status: reports.status,
      createdAt: reports.createdAt,
      reporterName: sql<string | null>`(select display_name from profiles where id = ${qualified("reports.reporter_id")})`,
      subject: sql<string | null>`
        coalesce(
          (select title from listings where id = ${qualified("reports.target_id")}),
          (select left(body, 120) from comments where id = ${qualified("reports.target_id")}),
          (select left(body, 120) from messages where id = ${qualified("reports.target_id")}),
          (select display_name from profiles where id = ${qualified("reports.target_id")})
        )`,
      listingSlug: sql<string | null>`(select slug from listings where id = ${qualified("reports.target_id")})`,
    })
    .from(reports)
    .orderBy(
      asc(sql`case when ${reports.status} = 'open' then 0 else 1 end`),
      desc(sql`coalesce((${reports.riskScore} ->> 'score')::int, 0)`),
      desc(reports.createdAt),
    )
    .limit(limit);
}

export async function adminUsers(term?: string, limit = 100) {
  return db
    .select({
      id: profiles.id,
      email: profiles.email,
      displayName: profiles.displayName,
      role: profiles.role,
      city: profiles.city,
      country: profiles.country,
      verifiedAt: profiles.verifiedAt,
      suspendedAt: profiles.suspendedAt,
      createdAt: profiles.createdAt,
      listingCount: sql<number>`(select count(*)::int from ${listings} where seller_profile_id = ${qualified("profiles.id")} and deleted_at is null)`,
      commentCount: sql<number>`(select count(*)::int from ${comments} where author_id = ${qualified("profiles.id")} and deleted_at is null)`,
      orderCount: sql<number>`(select count(*)::int from ${orders} where buyer_id = ${qualified("profiles.id")} or seller_id = ${qualified("profiles.id")})`,
      organisationNames: sql<string | null>`(
        select string_agg(o.name, ', ') from organisation_members om
        join organisations o on o.id = om.organisation_id
        where om.profile_id = ${qualified("profiles.id")}
      )`,
    })
    .from(profiles)
    .where(
      term
        ? or(ilike(profiles.email, `%${term}%`), ilike(profiles.displayName, `%${term}%`))
        : undefined,
    )
    .orderBy(desc(profiles.createdAt))
    .limit(limit);
}

export async function adminUser(profileId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!profile) return null;

  const [userListings, userComments, memberships] = await Promise.all([
    db
      .select({
        id: listings.id,
        slug: listings.slug,
        title: listings.title,
        status: listings.status,
        priceCents: listings.priceCents,
        currency: listings.currency,
        deletedAt: listings.deletedAt,
      })
      .from(listings)
      .where(eq(listings.sellerProfileId, profileId))
      .orderBy(desc(listings.createdAt))
      .limit(50),
    db
      .select({
        id: comments.id,
        body: comments.body,
        status: comments.status,
        targetType: comments.targetType,
        targetId: comments.targetId,
        createdAt: comments.createdAt,
        deletedAt: comments.deletedAt,
      })
      .from(comments)
      .where(eq(comments.authorId, profileId))
      .orderBy(desc(comments.createdAt))
      .limit(50),
    db
      .select({ name: organisations.name, slug: organisations.slug, role: organisationMembers.role })
      .from(organisationMembers)
      .innerJoin(organisations, eq(organisations.id, organisationMembers.organisationId))
      .where(eq(organisationMembers.profileId, profileId)),
  ]);

  return { profile, listings: userListings, comments: userComments, memberships };
}

export async function adminListings(status?: string, includeDeleted = false, limit = 100) {
  return db
    .select({
      id: listings.id,
      slug: listings.slug,
      reference: listings.reference,
      title: listings.title,
      status: listings.status,
      priceCents: listings.priceCents,
      currency: listings.currency,
      createdAt: listings.createdAt,
      deletedAt: listings.deletedAt,
      featuredUntil: listings.featuredUntil,
      verifiedAt: listings.verifiedAt,
      sellerName: profiles.displayName,
      sellerId: profiles.id,
      organisationName: organisations.name,
      modelStatus: sql<string>`(select status from equipment_models m where m.id = ${qualified("listings.model_id")})`,
      serialPhotoPath: sql<string | null>`(
        select storage_path from listing_attachments a
        where a.listing_id = ${qualified("listings.id")} and a.kind = 'serial_plate'
        order by a.created_at desc limit 1
      )`,
    })
    .from(listings)
    .innerJoin(profiles, eq(profiles.id, listings.sellerProfileId))
    .leftJoin(organisations, eq(organisations.id, listings.sellerOrgId))
    .where(
      and(
        status ? eq(listings.status, status as typeof listings.$inferSelect.status) : undefined,
        includeDeleted ? undefined : isNull(listings.deletedAt),
      ),
    )
    .orderBy(desc(listings.createdAt))
    .limit(limit);
}

export async function adminComments(limit = 100) {
  return db
    .select({
      id: comments.id,
      body: comments.body,
      status: comments.status,
      targetType: comments.targetType,
      targetId: comments.targetId,
      createdAt: comments.createdAt,
      deletedAt: comments.deletedAt,
      hiddenReason: comments.hiddenReason,
      authorName: profiles.displayName,
      authorId: profiles.id,
      modelSlug: sql<string | null>`(select slug from equipment_models where id = ${qualified("comments.target_id")})`,
      listingSlug: sql<string | null>`(select slug from listings where id = ${qualified("comments.target_id")})`,
    })
    .from(comments)
    .innerJoin(profiles, eq(profiles.id, comments.authorId))
    .orderBy(desc(comments.createdAt))
    .limit(limit);
}

export async function adminModels(status?: "pending" | "published", limit = 200) {
  return db
    .select({
      id: equipmentModels.id,
      name: equipmentModels.name,
      slug: equipmentModels.slug,
      recordNumber: equipmentModels.recordNumber,
      status: equipmentModels.status,
      manufacturerName: manufacturers.name,
      manufacturerStatus: manufacturers.status,
      manufacturerWebsite: manufacturers.website,
      categoryName: categories.name,
      parentCategoryName: sql<Localized | null>`(select name from categories p where p.id = ${qualified("categories.parent_id")})`,
      proposedById: equipmentModels.proposedBy,
      proposedByName: sql<string | null>`(select display_name from profiles where id = ${qualified("equipment_models.proposed_by")})`,
      listingCount: sql<number>`(select count(*)::int from ${listings} where model_id = ${qualified("equipment_models.id")})`,
      createdAt: equipmentModels.createdAt,
    })
    .from(equipmentModels)
    .innerJoin(manufacturers, eq(manufacturers.id, equipmentModels.manufacturerId))
    .innerJoin(categories, eq(categories.id, equipmentModels.categoryId))
    .where(status ? eq(equipmentModels.status, status) : undefined)
    .orderBy(
      asc(sql`case when ${equipmentModels.status} = 'pending' then 0 else 1 end`),
      desc(equipmentModels.createdAt),
    )
    .limit(limit);
}

/** Manufacturers sellers added that nobody has checked yet. */
export async function adminPendingManufacturers() {
  return db
    .select({
      id: manufacturers.id,
      name: manufacturers.name,
      website: manufacturers.website,
      createdAt: manufacturers.createdAt,
      proposedByName: sql<string | null>`(select display_name from profiles where id = ${qualified("manufacturers.proposed_by")})`,
      modelCount: sql<number>`(select count(*)::int from ${equipmentModels} where manufacturer_id = ${qualified("manufacturers.id")})`,
    })
    .from(manufacturers)
    .where(eq(manufacturers.status, "pending"))
    .orderBy(desc(manufacturers.createdAt));
}

export async function adminOrders(status?: string, limit = 100) {
  return db
    .select({
      id: orders.id,
      reference: orders.reference,
      status: orders.status,
      amountCents: orders.amountCents,
      sellerFeeCents: orders.sellerFeeCents,
      buyerFeeCents: orders.buyerFeeCents,
      currency: orders.currency,
      createdAt: orders.createdAt,
      disputeReason: orders.disputeReason,
      listingTitle: listings.title,
      buyerName: sql<string>`(select display_name from profiles where id = ${qualified("orders.buyer_id")})`,
      sellerName: sql<string>`(select display_name from profiles where id = ${qualified("orders.seller_id")})`,
    })
    .from(orders)
    .innerJoin(listings, eq(listings.id, orders.listingId))
    .where(status ? eq(orders.status, status as typeof orders.$inferSelect.status) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

export async function adminOrganisations() {
  return db
    .select({
      id: organisations.id,
      name: organisations.name,
      slug: organisations.slug,
      type: organisations.type,
      city: organisations.city,
      country: organisations.country,
      verifiedAt: organisations.verifiedAt,
      suspendedAt: organisations.suspendedAt,
      memberCount: sql<number>`(select count(*)::int from ${organisationMembers} where organisation_id = ${qualified("organisations.id")})`,
      listingCount: sql<number>`(select count(*)::int from ${listings} where seller_org_id = ${qualified("organisations.id")} and deleted_at is null)`,
    })
    .from(organisations)
    .orderBy(asc(organisations.name));
}

export async function adminAuditLog(limit = 150, actorId?: string) {
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      summary: auditLog.summary,
      before: auditLog.before,
      after: auditLog.after,
      createdAt: auditLog.createdAt,
      actorName: sql<string | null>`(select display_name from profiles where id = ${qualified("audit_log.actor_id")})`,
    })
    .from(auditLog)
    .where(actorId ? eq(auditLog.actorId, actorId) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

export async function adminPages() {
  return db.select().from(contentPages).orderBy(asc(contentPages.slug));
}

export async function adminPage(slug: string) {
  const [row] = await db.select().from(contentPages).where(eq(contentPages.slug, slug)).limit(1);
  return row ?? null;
}

export async function duplicateModelCandidates() {
  return db
    .select({
      manufacturerName: manufacturers.name,
      name: equipmentModels.name,
      count: sql<number>`count(*)::int`,
      ids: sql<string[]>`array_agg(${equipmentModels.id}::text)`,
    })
    .from(equipmentModels)
    .innerJoin(manufacturers, eq(manufacturers.id, equipmentModels.manufacturerId))
    .where(isNull(equipmentModels.mergedIntoId))
    .groupBy(manufacturers.name, equipmentModels.name)
    .having(sql`count(*) > 1`);
}

export async function messageReports() {
  return db
    .select({
      id: messages.id,
      body: messages.body,
      createdAt: messages.createdAt,
      senderName: profiles.displayName,
      conversationId: messages.conversationId,
    })
    .from(messages)
    .innerJoin(profiles, eq(profiles.id, messages.senderId))
    .where(
      isNotNull(
        sql`(select 1 from ${reports} where target_type = 'message' and target_id = ${qualified("messages.id")} limit 1)`,
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(50);
}

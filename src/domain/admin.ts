import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { equipmentModels } from "@/db/schema/catalogue";
import { organisations, profiles } from "@/db/schema/identity";
import { listings } from "@/db/schema/marketplace";
import { contentPages } from "@/db/schema/operations";
import type { SessionUser } from "@/auth/session";
import { assert, isAdmin } from "./permissions";
import { enqueue, recordAudit } from "./audit";
import type { Localized } from "@/db/schema/common";

/** Everything here is administration; each function records what it changed. */

export async function setUserSuspended(user: SessionUser, profileId: string, suspended: boolean, reason?: string) {
  assert(isAdmin(user), "Admin only");
  assert(profileId !== user.id, "You cannot suspend yourself");

  const [before] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  const [after] = await db
    .update(profiles)
    .set({
      suspendedAt: suspended ? new Date() : null,
      suspendedReason: suspended ? (reason ?? null) : null,
    })
    .where(eq(profiles.id, profileId))
    .returning();

  await recordAudit({
    actorId: user.id,
    action: suspended ? "user.suspended" : "user.unsuspended",
    targetType: "profile",
    targetId: profileId,
    summary: reason ?? after!.email,
    before: { suspendedAt: before?.suspendedAt ?? null },
    after: { suspendedAt: after!.suspendedAt },
  });
  return after!;
}

export async function setUserVerified(user: SessionUser, profileId: string, verified: boolean) {
  assert(isAdmin(user), "Admin only");
  const [after] = await db
    .update(profiles)
    .set({ verifiedAt: verified ? new Date() : null })
    .where(eq(profiles.id, profileId))
    .returning();
  await recordAudit({
    actorId: user.id,
    action: verified ? "user.verified" : "user.unverified",
    targetType: "profile",
    targetId: profileId,
    summary: after!.email,
  });
  return after!;
}

export async function setUserRole(user: SessionUser, profileId: string, role: "user" | "admin") {
  assert(isAdmin(user), "Admin only");
  // Removing your own admin rights would lock you out of this screen.
  assert(profileId !== user.id, "You cannot change your own role");

  const [before] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  const [after] = await db.update(profiles).set({ role }).where(eq(profiles.id, profileId)).returning();

  await recordAudit({
    actorId: user.id,
    action: "user.role_changed",
    targetType: "profile",
    targetId: profileId,
    summary: `${before?.role} → ${role}`,
    before: { role: before?.role },
    after: { role },
  });
  return after!;
}

export async function setOrganisationVerified(user: SessionUser, organisationId: string, verified: boolean) {
  assert(isAdmin(user), "Admin only");
  const [after] = await db
    .update(organisations)
    .set({ verifiedAt: verified ? new Date() : null })
    .where(eq(organisations.id, organisationId))
    .returning();
  await recordAudit({
    actorId: user.id,
    action: verified ? "organisation.verified" : "organisation.unverified",
    targetType: "organisation",
    targetId: organisationId,
    summary: after!.name,
  });
  return after!;
}

export async function setListingVerified(user: SessionUser, listingId: string, verified: boolean) {
  assert(isAdmin(user), "Admin only");
  const [after] = await db
    .update(listings)
    .set({ verifiedAt: verified ? new Date() : null, inspectedAt: verified ? new Date() : null })
    .where(eq(listings.id, listingId))
    .returning();
  await enqueue("listing.reindex", { listingId });
  await recordAudit({
    actorId: user.id,
    action: verified ? "listing.verified" : "listing.unverified",
    targetType: "listing",
    targetId: listingId,
    summary: after!.title,
  });
  return after!;
}

export async function setListingFeatured(user: SessionUser, listingId: string, days: number) {
  assert(isAdmin(user), "Admin only");
  const until = days > 0 ? new Date(Date.now() + days * 86_400_000) : null;
  const [after] = await db
    .update(listings)
    .set({ featuredUntil: until })
    .where(eq(listings.id, listingId))
    .returning();
  await enqueue("listing.reindex", { listingId });
  await recordAudit({
    actorId: user.id,
    action: until ? "listing.featured" : "listing.unfeatured",
    targetType: "listing",
    targetId: listingId,
    summary: after!.title,
  });
  return after!;
}

export async function approveListing(user: SessionUser, listingId: string) {
  assert(isAdmin(user), "Admin only");
  const [after] = await db
    .update(listings)
    .set({ status: "active", publishedAt: new Date() })
    .where(and(eq(listings.id, listingId), eq(listings.status, "pending_review")))
    .returning();
  if (!after) return null;

  await enqueue("listing.reindex", { listingId });
  await enqueue("listing.published", { listingId, requiresReview: false });
  await recordAudit({
    actorId: user.id,
    action: "listing.approved",
    targetType: "listing",
    targetId: listingId,
    summary: after.title,
  });
  return after;
}

export async function approveModel(user: SessionUser, modelId: string) {
  assert(isAdmin(user), "Admin only");
  const [after] = await db
    .update(equipmentModels)
    .set({ status: "published" })
    .where(eq(equipmentModels.id, modelId))
    .returning();
  await recordAudit({
    actorId: user.id,
    action: "model.approved",
    targetType: "equipment_model",
    targetId: modelId,
    summary: after!.name,
  });
  return after!;
}

/**
 * Merging is the fix for the same instrument entered twice. Listings move to
 * the surviving record, and the merged one keeps a pointer so old links still
 * resolve.
 */
export async function mergeModels(user: SessionUser, sourceId: string, targetId: string) {
  assert(isAdmin(user), "Admin only");
  assert(sourceId !== targetId, "Cannot merge a model into itself");

  const [source] = await db.select().from(equipmentModels).where(eq(equipmentModels.id, sourceId)).limit(1);
  const [target] = await db.select().from(equipmentModels).where(eq(equipmentModels.id, targetId)).limit(1);
  assert(!!source && !!target, "Model not found");

  const moved = await db.transaction(async (tx) => {
    const affected = await tx
      .update(listings)
      .set({ modelId: targetId })
      .where(eq(listings.modelId, sourceId))
      .returning({ id: listings.id });

    await tx
      .update(equipmentModels)
      .set({ status: "merged", mergedIntoId: targetId })
      .where(eq(equipmentModels.id, sourceId));

    return affected;
  });

  for (const listing of moved) await enqueue("listing.reindex", { listingId: listing.id });

  await recordAudit({
    actorId: user.id,
    action: "model.merged",
    targetType: "equipment_model",
    targetId: sourceId,
    summary: `${source!.name} → ${target!.name} (${moved.length})`,
    before: { status: source!.status, mergedIntoId: null },
    after: { status: "merged", mergedIntoId: targetId, movedListings: moved.length },
  });

  return { movedListings: moved.length };
}

export async function savePage(
  user: SessionUser,
  input: { id?: string; slug: string; title: Localized; body: Localized; published: boolean; showInFooter: boolean },
) {
  assert(isAdmin(user), "Admin only");
  const [before] = await db.select().from(contentPages).where(eq(contentPages.slug, input.slug)).limit(1);

  const [after] = await db
    .insert(contentPages)
    .values({
      slug: input.slug,
      title: input.title,
      body: input.body,
      published: input.published,
      showInFooter: input.showInFooter,
    })
    .onConflictDoUpdate({
      target: contentPages.slug,
      set: {
        title: input.title,
        body: input.body,
        published: input.published,
        showInFooter: input.showInFooter,
        updatedAt: new Date(),
      },
    })
    .returning();

  await recordAudit({
    actorId: user.id,
    action: before ? "page.updated" : "page.created",
    targetType: "content_page",
    targetId: after!.id,
    summary: input.slug,
    before: before ? { title: before.title, published: before.published } : null,
    after: { title: after!.title, published: after!.published },
  });
  return after!;
}

export async function marketplaceMetrics() {
  const [row] = await db
    .select({
      // Liquidity: how many live listings have ever drawn an offer.
      listingsWithOffers: sql<number>`(
        select count(distinct listing_id)::int from offers
      )`,
      activeListings: sql<number>`(select count(*)::int from ${listings} where status = 'active')`,
      soldListings: sql<number>`(select count(*)::int from ${listings} where status = 'sold')`,
      medianDaysToSell: sql<number | null>`(
        select percentile_cont(0.5) within group (
          order by extract(epoch from (completed_at - created_at)) / 86400
        ) from orders where status = 'completed' and completed_at is not null
      )`,
      disputeRate: sql<number>`(
        select case when count(*) = 0 then 0
          else round(100.0 * count(*) filter (where status in ('disputed','refunded')) / count(*))
        end::int from orders
      )`,
    })
    .from(sql`(select 1) as one`);
  return row!;
}

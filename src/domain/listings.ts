import { and, eq, isNull, like, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { equipmentModels } from "@/db/schema/catalogue";
import { listingImages, listings } from "@/db/schema/marketplace";
import type { SessionUser } from "@/auth/session";
import { assert, canEditListing, canPublishListing } from "./permissions";
import { enqueue, recordAudit } from "./audit";
import { slugify, uniqueSlug } from "./slug";
import { flagsFromEnv } from "./flags";

export type ListingDraftInput = {
  modelId: string;
  organisationId?: string | null;
};

/** A readable, stable reference (RL-L-000000) rather than a bare UUID. */
async function nextReference() {
  const rows = await db.execute<{ next: string }>(
    sql`select 'RL-L-' || lpad((10000 + count(*))::text, 6, '0') as next from ${listings}`,
  );
  return (rows as unknown as { next: string }[])[0]?.next ?? `RL-L-${Date.now()}`;
}

/** Only compares against slugs that could actually collide. */
async function freeSlug(base: string) {
  const root = slugify(base) || "inserat";
  const rows = await db
    .select({ slug: listings.slug })
    .from(listings)
    .where(like(listings.slug, `${root}%`));
  return uniqueSlug(root, new Set(rows.map((r) => r.slug)));
}

export async function createDraft(user: SessionUser, input: ListingDraftInput) {
  assert(canPublishListing(user, input.organisationId), "Not allowed to create listings");

  const [model] = await db
    .select()
    .from(equipmentModels)
    .where(eq(equipmentModels.id, input.modelId))
    .limit(1);
  assert(!!model, "Unknown model");

  const reference = await nextReference();
  const slug = await freeSlug(`${model!.name}-${reference}`);

  const [row] = await db
    .insert(listings)
    .values({
      reference,
      sellerProfileId: user.id,
      sellerOrgId: input.organisationId ?? null,
      modelId: input.modelId,
      title: model!.name,
      slug,
      condition: "good",
      priceCents: 0,
      locationCity: "",
      status: "draft",
    })
    .returning();

  await recordAudit({
    actorId: user.id,
    action: "listing.draft_created",
    targetType: "listing",
    targetId: row!.id,
    summary: model!.name,
  });
  return row!;
}

export async function getEditableListing(user: SessionUser, listingId: string) {
  const [row] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, listingId), isNull(listings.deletedAt)))
    .limit(1);
  assert(!!row, "Listing not found");
  assert(canEditListing(user, row!), "Not your listing");
  return row!;
}

export type ListingPatch = Partial<{
  title: string;
  description: string;
  scopeOfDelivery: string;
  condition: typeof listings.$inferInsert.condition;
  conditionNotes: string;
  year: number | null;
  operatingHours: number | null;
  serialSuffix: string | null;
  priceCents: number;
  currency: typeof listings.$inferInsert.currency;
  minPriceCents: number | null;
  negotiable: typeof listings.$inferInsert.negotiable;
  locationCity: string;
  locationCountry: string;
  warrantyMonths: number;
}>;

export async function updateListing(user: SessionUser, listingId: string, patch: ListingPatch) {
  const before = await getEditableListing(user, listingId);

  // Keep the slug in step with the title while the listing is still a draft.
  const slug =
    before.status === "draft" && patch.title && slugify(patch.title) !== slugify(before.title)
      ? await freeSlug(`${patch.title}-${before.reference}`)
      : undefined;

  const [after] = await db
    .update(listings)
    .set({ ...patch, ...(slug ? { slug } : {}) })
    .where(eq(listings.id, listingId))
    .returning();

  await enqueue("listing.reindex", { listingId });
  if (user.role === "admin" && before.sellerProfileId !== user.id) {
    await recordAudit({
      actorId: user.id,
      action: "listing.edited",
      targetType: "listing",
      targetId: listingId,
      summary: after!.title,
      before: before as unknown as Record<string, unknown>,
      after: after as unknown as Record<string, unknown>,
    });
  }
  return after!;
}

export function readyToPublish(listing: typeof listings.$inferSelect, imageCount: number) {
  const problems: string[] = [];
  if (!listing.title.trim()) problems.push("title");
  if (listing.priceCents <= 0) problems.push("price");
  if (!listing.locationCity.trim()) problems.push("location");
  if (!listing.conditionNotes?.trim()) problems.push("conditionNotes");
  if (imageCount === 0) problems.push("images");
  return problems;
}

export async function publishListing(user: SessionUser, listingId: string) {
  const listing = await getEditableListing(user, listingId);
  const images = await db
    .select({ id: listingImages.id })
    .from(listingImages)
    .where(eq(listingImages.listingId, listingId));

  const problems = readyToPublish(listing, images.length);
  if (problems.length) return { ok: false as const, problems };

  // Whether new listings need approval is still an open question, so it is a flag.
  const requiresReview = flagsFromEnv().requireListingReview && user.role !== "admin";
  const [row] = await db
    .update(listings)
    .set({
      status: requiresReview ? "pending_review" : "active",
      publishedAt: requiresReview ? null : new Date(),
    })
    .where(eq(listings.id, listingId))
    .returning();

  await enqueue("listing.reindex", { listingId });
  await enqueue("listing.published", { listingId, requiresReview });
  await recordAudit({
    actorId: user.id,
    action: requiresReview ? "listing.submitted" : "listing.published",
    targetType: "listing",
    targetId: listingId,
    summary: row!.title,
  });
  return { ok: true as const, listing: row!, requiresReview };
}

export async function setListingStatus(
  user: SessionUser,
  listingId: string,
  status: typeof listings.$inferInsert.status,
) {
  const before = await getEditableListing(user, listingId);
  const [after] = await db
    .update(listings)
    .set({
      status,
      publishedAt: status === "active" ? (before.publishedAt ?? new Date()) : before.publishedAt,
    })
    .where(eq(listings.id, listingId))
    .returning();
  await enqueue("listing.reindex", { listingId });
  await recordAudit({
    actorId: user.id,
    action: `listing.${status}`,
    targetType: "listing",
    targetId: listingId,
    summary: after!.title,
    before: { status: before.status },
    after: { status },
  });
  return after!;
}

/** User content is never hard-deleted, so moderation decisions stay reviewable. */
export async function softDeleteListing(user: SessionUser, listingId: string) {
  const before = await getEditableListing(user, listingId);
  await db
    .update(listings)
    .set({ deletedAt: new Date(), deletedBy: user.id, status: "withdrawn" })
    .where(eq(listings.id, listingId));
  await recordAudit({
    actorId: user.id,
    action: "listing.deleted",
    targetType: "listing",
    targetId: listingId,
    summary: before.title,
    before: { status: before.status, deletedAt: null },
    after: { status: "withdrawn", deletedAt: new Date().toISOString() },
  });
}

export async function restoreListing(user: SessionUser, listingId: string) {
  await db
    .update(listings)
    .set({ deletedAt: null, deletedBy: null })
    .where(eq(listings.id, listingId));
  await recordAudit({
    actorId: user.id,
    action: "listing.restored",
    targetType: "listing",
    targetId: listingId,
  });
}

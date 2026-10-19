import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, equipmentModels, manufacturers } from "@/db/schema/catalogue";
import { organisations, profiles } from "@/db/schema/identity";
import { listingAttachments, listingImages, listings } from "@/db/schema/marketplace";

export async function getListingBySlug(slug: string) {
  const [row] = await db
    .select({
      listing: listings,
      model: equipmentModels,
      manufacturer: manufacturers,
      category: categories,
      seller: {
        id: profiles.id,
        displayName: profiles.displayName,
        city: profiles.city,
        country: profiles.country,
        verifiedAt: profiles.verifiedAt,
        createdAt: profiles.createdAt,
        avatarPath: profiles.avatarPath,
        bio: profiles.bio,
      },
      organisation: {
        id: organisations.id,
        name: organisations.name,
        slug: organisations.slug,
        type: organisations.type,
        verifiedAt: organisations.verifiedAt,
        city: organisations.city,
        country: organisations.country,
        logoPath: organisations.logoPath,
        about: organisations.about,
      },
    })
    .from(listings)
    .innerJoin(equipmentModels, eq(equipmentModels.id, listings.modelId))
    .innerJoin(manufacturers, eq(manufacturers.id, equipmentModels.manufacturerId))
    .innerJoin(categories, eq(categories.id, equipmentModels.categoryId))
    .innerJoin(profiles, eq(profiles.id, listings.sellerProfileId))
    .leftJoin(organisations, eq(organisations.id, listings.sellerOrgId))
    .where(and(eq(listings.slug, slug), isNull(listings.deletedAt)))
    .limit(1);

  if (!row) return null;

  const [images, attachments, sellerStats] = await Promise.all([
    db
      .select()
      .from(listingImages)
      .where(eq(listingImages.listingId, row.listing.id))
      .orderBy(listingImages.sortOrder),
    // The serial plate photo is for the review only and never part of the public documents.
    db
      .select()
      .from(listingAttachments)
      .where(and(eq(listingAttachments.listingId, row.listing.id), ne(listingAttachments.kind, "serial_plate"))),
    db
      .select({
        activeListings: sql<number>`count(*) filter (where status = 'active')::int`,
        soldListings: sql<number>`count(*) filter (where status = 'sold')::int`,
      })
      .from(listings)
      .where(eq(listings.sellerProfileId, row.listing.sellerProfileId)),
  ]);

  return { ...row, images, attachments, sellerStats: sellerStats[0] ?? { activeListings: 0, soldListings: 0 } };
}

export async function relatedListings(listingId: string, modelId: string, categoryId: string, limit = 4) {
  const rows = await db
    .select({
      id: listings.id,
      slug: listings.slug,
      title: listings.title,
      priceCents: listings.priceCents,
      currency: listings.currency,
      condition: listings.condition,
      locationCity: listings.locationCity,
      year: listings.year,
      imagePath: sql<string | null>`(
        select storage_path from ${listingImages} where listing_id = "listings"."id"
        order by sort_order limit 1
      )`,
      sameModel: sql<boolean>`${listings.modelId} = ${modelId}`,
    })
    .from(listings)
    .innerJoin(equipmentModels, eq(equipmentModels.id, listings.modelId))
    .where(
      and(
        ne(listings.id, listingId),
        eq(listings.status, "active"),
        isNull(listings.deletedAt),
        sql`(${listings.modelId} = ${modelId} or ${equipmentModels.categoryId} = ${categoryId})`,
      ),
    )
    .orderBy(sql`(${listings.modelId} = ${modelId}) desc`, desc(listings.publishedAt))
    .limit(limit);
  return rows;
}

export async function incrementViewCount(listingId: string) {
  await db
    .update(listings)
    .set({ viewCount: sql`${listings.viewCount} + 1` })
    .where(eq(listings.id, listingId));
}

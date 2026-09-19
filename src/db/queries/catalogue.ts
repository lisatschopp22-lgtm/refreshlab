import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, equipmentModels, manufacturers } from "@/db/schema/catalogue";
import { listings } from "@/db/schema/marketplace";

/**
 * Drizzle renders a column inside a `sql` template without its table name,
 * which becomes ambiguous inside a correlated subquery that joins other
 * tables. This forces the qualified form.
 */
const qualified = (ref: string) => sql.raw(`"${ref.split(".")[0]}"."${ref.split(".")[1]}"`);

const publiclyVisible = and(
  eq(listings.status, "active"),
  isNull(listings.deletedAt),
);

export async function listCategories() {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      intro: categories.intro,
      icon: categories.icon,
      sortOrder: categories.sortOrder,
      listingCount: sql<number>`(
        select count(*)::int from ${listings} l
        join ${equipmentModels} m on m.id = l.model_id
        where m.category_id = ${qualified("categories.id")} and l.status = 'active' and l.deleted_at is null
      )`,
      modelCount: sql<number>`(
        select count(*)::int from ${equipmentModels} m
        where m.category_id = ${qualified("categories.id")} and m.status = 'published'
      )`,
    })
    .from(categories)
    .where(isNull(categories.parentId))
    .orderBy(asc(categories.sortOrder));
  return rows;
}

export async function getCategoryBySlug(slug: string) {
  const [row] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return row ?? null;
}

export async function listManufacturers(categoryId?: string) {
  return db
    .select({
      id: manufacturers.id,
      slug: manufacturers.slug,
      name: manufacturers.name,
      country: manufacturers.country,
      website: manufacturers.website,
      modelCount: sql<number>`(
        select count(*)::int from ${equipmentModels} m
        where m.manufacturer_id = ${qualified("manufacturers.id")}
        ${categoryId ? sql`and m.category_id = ${categoryId}` : sql``}
      )`,
    })
    .from(manufacturers)
    .orderBy(asc(manufacturers.name));
}

export async function getManufacturerBySlug(slug: string) {
  const [row] = await db.select().from(manufacturers).where(eq(manufacturers.slug, slug)).limit(1);
  return row ?? null;
}

export type ModelWithContext = Awaited<ReturnType<typeof getModelBySlug>>;

export async function getModelBySlug(slug: string) {
  const [row] = await db
    .select({
      model: equipmentModels,
      manufacturer: manufacturers,
      category: categories,
    })
    .from(equipmentModels)
    .innerJoin(manufacturers, eq(manufacturers.id, equipmentModels.manufacturerId))
    .innerJoin(categories, eq(categories.id, equipmentModels.categoryId))
    .where(eq(equipmentModels.slug, slug))
    .limit(1);
  return row ?? null;
}

/** Price range across live listings, used for the market block on a model page. */
export async function modelPriceRange(modelId: string) {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      min: sql<number | null>`min(${listings.priceCents})`,
      max: sql<number | null>`max(${listings.priceCents})`,
      median: sql<number | null>`percentile_cont(0.5) within group (order by ${listings.priceCents})`,
    })
    .from(listings)
    .where(and(eq(listings.modelId, modelId), publiclyVisible));
  if (!row || row.count === 0 || row.min == null) return null;
  return {
    count: Number(row.count),
    minCents: Number(row.min),
    maxCents: Number(row.max),
    medianCents: Math.round(Number(row.median)),
  };
}

export async function listModelsForCategory(categoryId: string, limit = 60) {
  return db
    .select({
      id: equipmentModels.id,
      slug: equipmentModels.slug,
      name: equipmentModels.name,
      imagePath: equipmentModels.imagePath,
      summary: equipmentModels.summary,
      discontinued: equipmentModels.discontinued,
      manufacturerName: manufacturers.name,
      manufacturerSlug: manufacturers.slug,
      listingCount: sql<number>`(
        select count(*)::int from ${listings} l
        where l.model_id = ${qualified("equipment_models.id")} and l.status = 'active' and l.deleted_at is null
      )`,
    })
    .from(equipmentModels)
    .innerJoin(manufacturers, eq(manufacturers.id, equipmentModels.manufacturerId))
    .where(and(eq(equipmentModels.categoryId, categoryId), eq(equipmentModels.status, "published")))
    .orderBy(asc(manufacturers.name), asc(equipmentModels.name))
    .limit(limit);
}

export async function listModelsForManufacturer(manufacturerId: string, limit = 100) {
  return db
    .select({
      id: equipmentModels.id,
      slug: equipmentModels.slug,
      name: equipmentModels.name,
      imagePath: equipmentModels.imagePath,
      summary: equipmentModels.summary,
      discontinued: equipmentModels.discontinued,
      categorySlug: categories.slug,
      categoryName: categories.name,
      listingCount: sql<number>`(
        select count(*)::int from ${listings} l
        where l.model_id = ${qualified("equipment_models.id")} and l.status = 'active' and l.deleted_at is null
      )`,
    })
    .from(equipmentModels)
    .innerJoin(categories, eq(categories.id, equipmentModels.categoryId))
    .where(and(eq(equipmentModels.manufacturerId, manufacturerId), eq(equipmentModels.status, "published")))
    .orderBy(asc(categories.sortOrder), asc(equipmentModels.name))
    .limit(limit);
}

export async function catalogueCounts() {
  const [row] = await db
    .select({
      models: sql<number>`(select count(*)::int from ${equipmentModels} where status = 'published')`,
      listings: sql<number>`(select count(*)::int from ${listings} where status = 'active' and deleted_at is null)`,
      manufacturers: sql<number>`(select count(*)::int from ${manufacturers})`,
    })
    .from(sql`(select 1) as one`);
  return row ?? { models: 0, listings: 0, manufacturers: 0 };
}

/** Everything the sitemap and the public feed need, newest first. */
export async function allPublicSlugs() {
  const [listingRows, modelRows, categoryRows, manufacturerRows] = await Promise.all([
    db
      .select({ slug: listings.slug, updatedAt: listings.updatedAt })
      .from(listings)
      .where(publiclyVisible)
      .orderBy(desc(listings.publishedAt)),
    db
      .select({ slug: equipmentModels.slug, updatedAt: equipmentModels.updatedAt })
      .from(equipmentModels)
      .where(eq(equipmentModels.status, "published")),
    db.select({ slug: categories.slug, updatedAt: categories.updatedAt }).from(categories),
    db.select({ slug: manufacturers.slug, updatedAt: manufacturers.updatedAt }).from(manufacturers),
  ]);
  return { listings: listingRows, models: modelRows, categories: categoryRows, manufacturers: manufacturerRows };
}

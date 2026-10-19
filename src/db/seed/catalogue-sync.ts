import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as s from "../schema";
import {
  categories as categorySeed,
  consumableCategories,
  manufacturers as manufacturerSeed,
} from "./catalogue-data";

type Database = PostgresJsDatabase<typeof s>;

/**
 * Brings manufacturers and the category tree in line with the seed data and
 * touches nothing else, so it serves a fresh database and one people have
 * already used. Rows are matched by slug: missing ones are inserted, existing
 * ones updated, nothing is deleted.
 */
export async function syncCatalogue(db: Database) {
  const manufacturerIdBySlug = new Map<string, string>();
  for (const m of manufacturerSeed) {
    const values = { name: m.name, country: m.country, website: m.website ?? null };
    const [row] = await db
      .insert(s.manufacturers)
      .values({ slug: m.slug, ...values })
      .onConflictDoUpdate({ target: s.manufacturers.slug, set: values })
      .returning({ id: s.manufacturers.id });
    manufacturerIdBySlug.set(m.slug, row!.id);
  }

  const categoryIdBySlug = new Map<string, string>();
  const upsert = async ({ slug, ...values }: typeof s.categories.$inferInsert) => {
    const [row] = await db
      .insert(s.categories)
      .values({ slug, ...values })
      .onConflictDoUpdate({ target: s.categories.slug, set: values })
      .returning({ id: s.categories.id });
    categoryIdBySlug.set(slug, row!.id);
    return row!.id;
  };

  for (const [index, c] of categorySeed.entries()) {
    const parentId = await upsert({
      slug: c.slug,
      kind: "equipment",
      parentId: null,
      name: c.name,
      intro: c.intro,
      icon: c.icon,
      sortOrder: index,
      specSchema: c.specs,
    });
    // A device type describes its models with the same fields as its parent.
    for (const [childIndex, child] of c.children.entries()) {
      await upsert({
        slug: child.slug,
        kind: "equipment",
        parentId,
        name: child.name,
        intro: null,
        icon: c.icon,
        sortOrder: childIndex,
        specSchema: c.specs,
      });
    }
  }

  for (const [index, c] of consumableCategories.entries()) {
    const parentId = await upsert({
      slug: c.slug,
      kind: "consumable",
      parentId: null,
      name: c.name,
      intro: null,
      icon: null,
      sortOrder: index,
      specSchema: [],
    });
    for (const [childIndex, child] of c.children.entries()) {
      await upsert({
        slug: child.slug,
        kind: "consumable",
        parentId,
        name: child.name,
        intro: null,
        icon: null,
        sortOrder: childIndex,
        specSchema: [],
      });
    }
  }

  return { manufacturerIdBySlug, categoryIdBySlug };
}

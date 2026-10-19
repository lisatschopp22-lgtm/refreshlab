import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DATABASE_URL } from "./env";
import * as s from "./schema";
import { syncCatalogue } from "./seed/catalogue-sync";
import { models as modelSeed } from "./seed/model-data";

/**
 * Updates manufacturers and categories in a database that is already in use,
 * without the reset `db:seed` performs: accounts, listings and proposals stay.
 * A seeded model moves to its device type only while it still sits where the
 * seed put it, so nothing an administrator or a seller changed is overwritten.
 */
async function main() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema: s, casing: "snake_case" });

  console.log("→ syncing manufacturers and categories");
  const { manufacturerIdBySlug, categoryIdBySlug } = await syncCatalogue(db);
  console.log(`  ${manufacturerIdBySlug.size} manufacturers, ${categoryIdBySlug.size} categories`);

  console.log("→ filing seeded models under their device type");
  let moved = 0;
  for (const m of modelSeed) {
    if (!m.sub) continue;
    const rows = await db
      .update(s.equipmentModels)
      .set({
        categoryId: categoryIdBySlug.get(m.sub)!,
        manufacturerId: manufacturerIdBySlug.get(m.manufacturer)!,
      })
      .where(and(eq(s.equipmentModels.name, m.name), eq(s.equipmentModels.categoryId, categoryIdBySlug.get(m.category)!)))
      .returning({ id: s.equipmentModels.id });
    moved += rows.length;
  }
  console.log(`  ${moved} models moved`);

  // The search haystack names the category, so it has to follow the move.
  console.log("→ reindexing listings");
  await client.unsafe(`update public.listings set search_text = public.listing_search_text(listings.*)`);

  await client.end();
  console.log("✓ catalogue up to date");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

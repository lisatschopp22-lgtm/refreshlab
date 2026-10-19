import { describe, expect, it } from "vitest";
import {
  catalogueCounts,
  listCategories,
  listChildCategories,
  listConsumableCategories,
  listManufacturers,
} from "@/db/queries/catalogue";
import { categories as categorySeed, consumableCategories, manufacturers } from "@/db/seed/catalogue-data";

describe("catalogue queries", () => {
  it("lists top-level equipment categories with counts", async () => {
    const rows = await listCategories();
    expect(rows.length).toBe(categorySeed.length);
    expect(rows.reduce((n, r) => n + r.modelCount, 0)).toBeGreaterThan(60);
  });
  it("counts a category's device types in its own totals", async () => {
    const zentrifugen = (await listCategories()).find((c) => c.slug === "zentrifugen")!;
    const types = await listChildCategories(zentrifugen.id);
    expect(types.length).toBeGreaterThan(0);
    expect(zentrifugen.modelCount).toBeGreaterThanOrEqual(types.reduce((n, t) => n + t.modelCount, 0));
    expect(types.some((t) => t.modelCount > 0)).toBe(true);
  });
  it("keeps consumables out of the equipment categories", async () => {
    const equipment = new Set((await listCategories()).map((c) => c.slug));
    const consumables = await listConsumableCategories();
    expect(consumables.length).toBe(consumableCategories.length);
    expect(consumables.filter((c) => equipment.has(c.slug))).toEqual([]);
  });
  it("counts the catalogue", async () => {
    const counts = await catalogueCounts();
    expect(counts.models).toBeGreaterThan(60);
    expect(counts.listings).toBeGreaterThan(50);
  });
  it("lists manufacturers", async () => {
    const rows = await listManufacturers();
    expect(rows.length).toBeGreaterThanOrEqual(manufacturers.length);
  });
});

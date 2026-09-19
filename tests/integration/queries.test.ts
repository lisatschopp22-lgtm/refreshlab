import { describe, expect, it } from "vitest";
import { catalogueCounts, listCategories, listManufacturers } from "@/db/queries/catalogue";

describe("catalogue queries", () => {
  it("lists top-level categories with counts", async () => {
    const rows = await listCategories();
    expect(rows.length).toBe(12);
    expect(rows.reduce((n, r) => n + r.modelCount, 0)).toBeGreaterThan(60);
  });
  it("counts the catalogue", async () => {
    const counts = await catalogueCounts();
    expect(counts.models).toBeGreaterThan(60);
    expect(counts.listings).toBeGreaterThan(50);
  });
  it("lists manufacturers", async () => {
    const rows = await listManufacturers();
    expect(rows.length).toBe(15);
  });
});

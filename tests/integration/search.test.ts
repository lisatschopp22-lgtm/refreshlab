import { describe, expect, it } from "vitest";
import { searchProvider } from "@/integrations/search";

const search = searchProvider();

describe("postgres search", () => {
  it("finds listings by category word", async () => {
    const result = await search.search({ q: "zentrifuge", perPage: 5 });
    expect(result.total).toBeGreaterThan(0);
    expect(result.items[0]?.title).toBeTruthy();
  });

  it("tolerates a typo in a manufacturer name", async () => {
    const clean = await search.search({ q: "eppendorf", perPage: 1 });
    const typo = await search.search({ q: "eppendrof", perPage: 1 });
    expect(clean.total).toBeGreaterThan(0);
    expect(typo.total).toBeGreaterThan(0);
  });

  it("matches a reference exactly", async () => {
    const all = await search.search({ perPage: 1 });
    const reference = all.items[0]!.reference;
    const byReference = await search.search({ q: reference });
    expect(byReference.items.some((i) => i.reference === reference)).toBe(true);
  });

  it("returns only publicly visible listings", async () => {
    const result = await search.search({ perPage: 100 });
    expect(result.items.every((i) => i.publishedAt !== null)).toBe(true);
  });

  it("narrows results when a facet is applied", async () => {
    const all = await search.search({ perPage: 1 });
    const filtered = await search.search({ condition: ["good"], perPage: 1 });
    expect(filtered.total).toBeLessThan(all.total);
    expect(filtered.total).toBeGreaterThan(0);
  });

  it("keeps the other values of a facet visible once one is chosen", async () => {
    // Standard facet behaviour: choosing "good" must not make the other
    // condition counts disappear, otherwise the filter is a dead end.
    const filtered = await search.search({ condition: ["good"] });
    expect(filtered.facets.condition.length).toBeGreaterThan(1);
  });

  it("counts facets consistently with the result total", async () => {
    const result = await search.search({ category: "zentrifugen" });
    const conditionSum = result.facets.condition.reduce((sum, f) => sum + f.count, 0);
    expect(conditionSum).toBe(result.total);
  });

  it("sorts by price in both directions", async () => {
    const asc = await search.search({ sort: "price_asc", perPage: 5 });
    const desc = await search.search({ sort: "price_desc", perPage: 5 });
    expect(asc.items[0]!.priceCents).toBeLessThanOrEqual(asc.items[4]!.priceCents);
    expect(desc.items[0]!.priceCents).toBeGreaterThanOrEqual(desc.items[4]!.priceCents);
  });

  it("filters by price range", async () => {
    const result = await search.search({ minPriceCents: 500_000, maxPriceCents: 1_500_000 });
    expect(result.items.every((i) => i.priceCents >= 500_000 && i.priceCents <= 1_500_000)).toBe(true);
  });

  it("reindexes without losing rows", async () => {
    const count = await search.reindex();
    expect(count).toBeGreaterThan(0);
  });
});

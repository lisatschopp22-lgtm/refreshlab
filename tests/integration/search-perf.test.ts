import { describe, expect, it } from "vitest";
import { searchProvider } from "@/integrations/search";

/** Times the full search call the page makes: items, count and six facets. */
describe("search performance", () => {
  it("reports timings for a text query and a facet-only query", async () => {
    const search = searchProvider();
    await search.search({ perPage: 24 });

    const time = async (label: string, run: () => Promise<unknown>) => {
      const start = performance.now();
      await run();
      const ms = performance.now() - start;
      console.log(`${label}: ${ms.toFixed(0)} ms`);
      return ms;
    };

    const facetOnly = await time("category filter", () =>
      search.search({ category: "zentrifugen", perPage: 24 }),
    );
    const textQuery = await time("text query", () => search.search({ q: "zentrifuge", perPage: 24 }));
    const noResults = await time("no results", () => search.search({ q: "xyzznothing", perPage: 24 }));

    expect(facetOnly).toBeLessThan(2000);
    expect(textQuery).toBeLessThan(2000);
    expect(noResults).toBeLessThan(2000);
  });
});

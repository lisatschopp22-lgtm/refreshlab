import { postgresSearch } from "./postgres";
import type { SearchProvider } from "./types";

export * from "./types";

/**
 * SEARCH_PROVIDER=postgres (default). The seam exists so Algolia or a local
 * Typesense container can be dropped in without touching any page.
 */
export function searchProvider(): SearchProvider {
  switch (process.env.SEARCH_PROVIDER) {
    case "postgres":
    default:
      return postgresSearch;
  }
}

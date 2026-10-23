import type { Currency } from "@/db/schema/common";
import type { Condition } from "@/domain/conditions";

export type SortKey = "relevance" | "newest" | "price_asc" | "price_desc";

export type SearchQuery = {
  q?: string;
  category?: string;
  /** Manufacturer slugs; a listing matches any of them. */
  manufacturers?: string[];
  /** Model slugs; a listing matches any of them. */
  models?: string[];
  condition?: Condition[];
  country?: string[];
  saleMode?: string[];
  minPriceCents?: number;
  maxPriceCents?: number;
  /** Year of manufacture, both ends included. */
  minYear?: number;
  maxYear?: number;
  verifiedOnly?: boolean;
  warrantyOnly?: boolean;
  modelId?: string;
  sellerId?: string;
  organisationId?: string;
  /** Left out of the items and the total, but still counted in the facets. */
  excludeIds?: string[];
  sort?: SortKey;
  page?: number;
  perPage?: number;
};

export type ListingCard = {
  id: string;
  slug: string;
  reference: string;
  title: string;
  priceCents: number;
  currency: Currency;
  condition: Condition;
  year: number | null;
  operatingHours: number | null;
  locationCity: string;
  locationCountry: string;
  warrantyMonths: number;
  inspectedAt: Date | null;
  verifiedAt: Date | null;
  featured: boolean;
  publishedAt: Date | null;
  imagePath: string | null;
  imageAlt: string | null;
  modelName: string;
  modelSlug: string;
  manufacturerName: string;
  categorySlug: string;
  sellerName: string;
  organisationName: string | null;
  organisationSlug: string | null;
  organisationVerified: boolean;
};

export type FacetValue = { value: string; label: string; count: number };

export type SearchFacets = {
  category: FacetValue[];
  manufacturer: FacetValue[];
  model: FacetValue[];
  condition: FacetValue[];
  country: FacetValue[];
  saleMode: FacetValue[];
  trust: { verified: number; warranty: number };
  priceRange: { minCents: number; maxCents: number } | null;
  yearRange: { min: number; max: number } | null;
};

export type SearchResult = {
  items: ListingCard[];
  total: number;
  facets: SearchFacets;
};

export interface SearchProvider {
  readonly name: string;
  search(query: SearchQuery): Promise<SearchResult>;
  /** Called by the outbox worker when a listing or its catalogue data changes. */
  reindex(listingIds?: string[]): Promise<number>;
}

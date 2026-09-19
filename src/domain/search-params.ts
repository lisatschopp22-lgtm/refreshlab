import type { SearchQuery, SortKey } from "@/integrations/search/types";
import type { Condition } from "./conditions";
import { conditions } from "./conditions";

export type RawParams = Record<string, string | string[] | undefined>;

const sorts: SortKey[] = ["relevance", "newest", "price_asc", "price_desc"];

function list(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : value.split(","))
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

function one(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.trim() || undefined;
}

function money(value: string | string[] | undefined): number | undefined {
  const v = one(value);
  if (!v) return undefined;
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n * 100 : undefined;
}

/** URL is the single source of truth for search state, so results stay shareable and server-rendered. */
export function parseSearchParams(params: RawParams): SearchQuery {
  const sort = one(params.sort);
  return {
    q: one(params.q),
    category: one(params.kategorie ?? params.category),
    manufacturer: one(params.hersteller ?? params.manufacturer),
    condition: list(params.zustand ?? params.condition).filter((c): c is Condition =>
      (conditions as readonly string[]).includes(c),
    ),
    country: list(params.land ?? params.country).map((c) => c.toUpperCase().slice(0, 2)),
    saleMode: list(params.art ?? params.saleMode).filter((m) => ["fixed", "offer", "both"].includes(m)),
    minPriceCents: money(params.min),
    maxPriceCents: money(params.max),
    verifiedOnly: one(params.geprueft ?? params.verified) === "1",
    warrantyOnly: one(params.garantie ?? params.warranty) === "1",
    sort: sorts.includes(sort as SortKey) ? (sort as SortKey) : undefined,
    page: Math.max(1, Number(one(params.seite ?? params.page) ?? 1) || 1),
  };
}

/** Rebuilds a URL with one facet toggled, keeping everything else intact. */
export function toggledHref(
  basePath: string,
  params: RawParams,
  key: string,
  value: string,
  multi = true,
): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    const joined = Array.isArray(v) ? v.join(",") : v;
    if (joined) next.set(k, joined);
  }
  next.delete("seite");

  if (multi) {
    const current = list(params[key]);
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    if (updated.length) next.set(key, updated.join(","));
    else next.delete(key);
  } else if (one(params[key]) === value) {
    next.delete(key);
  } else {
    next.set(key, value);
  }

  const query = next.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function withParam(basePath: string, params: RawParams, key: string, value?: string) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    const joined = Array.isArray(v) ? v.join(",") : v;
    if (joined) next.set(k, joined);
  }
  if (value) next.set(key, value);
  else next.delete(key);
  if (key !== "seite") next.delete("seite");
  const query = next.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function hasAnyFilter(query: SearchQuery) {
  return Boolean(
    query.category ||
      query.manufacturer ||
      query.condition?.length ||
      query.country?.length ||
      query.saleMode?.length ||
      query.minPriceCents ||
      query.maxPriceCents ||
      query.verifiedOnly ||
      query.warrantyOnly,
  );
}

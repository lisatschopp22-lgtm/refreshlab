import { sql, type SQL } from "drizzle-orm";
import { db, sqlClient } from "@/db/client";
import type {
  ListingCard,
  SearchFacets,
  SearchProvider,
  SearchQuery,
  SearchResult,
} from "./types";

type Dimension = "category" | "manufacturer" | "condition" | "country" | "saleMode";

const PER_PAGE = 24;

/** SEARCH_DEBUG=1 logs how long each part of a search takes. */
const debug = process.env.SEARCH_DEBUG === "1";
async function timed<T>(label: string, run: () => Promise<T>): Promise<T> {
  if (!debug) return run();
  const start = performance.now();
  const result = await run();
  console.log(`[search] ${label}: ${(performance.now() - start).toFixed(0)} ms`);
  return result;
}

/**
 * Postgres full-text search with trigram typo tolerance and SQL facets.
 * Algolia is hosted only, so the prototype uses what runs locally. Everything
 * sits behind SearchProvider, so swapping in Algolia or Typesense later means
 * writing one adapter, not touching the pages.
 */
class PostgresSearchProvider implements SearchProvider {
  readonly name = "postgres";

  private conditions(query: SearchQuery, exclude?: Dimension): SQL[] {
    const where: SQL[] = [
      sql`l.status = 'active'`,
      sql`l.deleted_at is null`,
      sql`l.published_at is not null`,
    ];

    if (query.q?.trim()) {
      const q = query.q.trim();
      // Both clauses are GIN-indexed, so Postgres can combine them with a
      // BitmapOr. Adding an ILIKE on the reference or the model name here
      // would force a sequential scan for no gain: search_text already
      // contains both. Measured at 5000 listings: 2 ms against 318 ms.
      where.push(sql`(
        l.search_vector @@ websearch_to_tsquery('german', ${q})
        or rl_unaccent(${q}) <% rl_unaccent(l.search_text)
      )`);
    }
    if (query.category && exclude !== "category") {
      where.push(sql`(c.slug = ${query.category} or parent.slug = ${query.category})`);
    }
    if (query.manufacturer && exclude !== "manufacturer") {
      where.push(sql`mf.slug = ${query.manufacturer}`);
    }
    if (query.condition?.length && exclude !== "condition") {
      where.push(sql`l.condition in ${sql.raw(`(${query.condition.map((c) => `'${c}'`).join(",")})`)}`);
    }
    if (query.country?.length && exclude !== "country") {
      where.push(sql`l.location_country in ${sql.raw(`(${query.country.map((c) => `'${c.replace(/'/g, "")}'`).join(",")})`)}`);
    }
    if (query.saleMode?.length && exclude !== "saleMode") {
      where.push(sql`l.sale_mode in ${sql.raw(`(${query.saleMode.map((c) => `'${c}'`).join(",")})`)}`);
    }
    if (typeof query.minPriceCents === "number") where.push(sql`l.price_cents >= ${query.minPriceCents}`);
    if (typeof query.maxPriceCents === "number") where.push(sql`l.price_cents <= ${query.maxPriceCents}`);
    if (query.verifiedOnly) where.push(sql`l.verified_at is not null`);
    if (query.warrantyOnly) where.push(sql`l.warranty_months > 0`);
    if (query.modelId) where.push(sql`l.model_id = ${query.modelId}`);
    if (query.sellerId) where.push(sql`l.seller_profile_id = ${query.sellerId}`);
    if (query.organisationId) where.push(sql`l.seller_org_id = ${query.organisationId}`);

    return where;
  }

  private from() {
    return sql`
      from listings l
      join equipment_models m on m.id = l.model_id
      join manufacturers mf on mf.id = m.manufacturer_id
      join categories c on c.id = m.category_id
      left join categories parent on parent.id = c.parent_id
      join profiles p on p.id = l.seller_profile_id
      left join organisations o on o.id = l.seller_org_id
    `;
  }

  private whereSql(parts: SQL[]) {
    return sql.join([sql`where `, sql.join(parts, sql` and `)], sql``);
  }

  private orderBy(query: SearchQuery) {
    const q = query.q?.trim();
    switch (query.sort ?? (q ? "relevance" : "newest")) {
      case "price_asc":
        return sql`order by l.price_cents asc, l.published_at desc`;
      case "price_desc":
        return sql`order by l.price_cents desc, l.published_at desc`;
      case "newest":
        return sql`order by l.published_at desc nulls last`;
      default:
        // Ranking: text match, then trigram closeness, then trust, then recency.
        // Verified and inspected units rank above incomplete ones, as the
        // requirements review asks for.
        return q
          ? sql`order by (
                ts_rank(l.search_vector, websearch_to_tsquery('german', ${q})) * 4
                + word_similarity(rl_unaccent(${q}), rl_unaccent(l.search_text)) * 2
                + case when l.verified_at is not null then 0.4 else 0 end
                + case when l.inspected_at is not null then 0.2 else 0 end
                + case when l.featured_until > now() then 0.3 else 0 end
              ) desc, l.published_at desc`
          : sql`order by (case when l.featured_until > now() then 1 else 0 end) desc, l.published_at desc nulls last`;
    }
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const perPage = query.perPage ?? PER_PAGE;
    const page = Math.max(1, query.page ?? 1);
    const offset = (page - 1) * perPage;
    const conditions = this.conditions(query);
    // Listings shown elsewhere on the page (highlights) must not repeat in the
    // list. The facets still count them, because they still match.
    const where = query.excludeIds?.length
      ? this.whereSql([
          ...conditions,
          sql`l.id not in (${sql.join(query.excludeIds.map((id) => sql`${id}`), sql`, `)})`,
        ])
      : this.whereSql(conditions);

    const itemsQuery = sql`
      select
        l.id, l.slug, l.reference, l.title, l.price_cents, l.currency, l.condition,
        l.year, l.operating_hours, l.location_city, l.location_country,
        l.warranty_months, l.inspected_at, l.verified_at, l.published_at,
        (l.featured_until > now()) as featured,
        m.name as model_name, m.slug as model_slug,
        mf.name as manufacturer_name, c.slug as category_slug,
        p.display_name as seller_name,
        o.name as organisation_name, o.slug as organisation_slug,
        (o.verified_at is not null) as organisation_verified,
        img.storage_path as image_path, img.alt as image_alt
      ${this.from()}
      left join lateral (
        select storage_path, alt from listing_images
        where listing_id = l.id order by sort_order limit 1
      ) img on true
      ${where}
      ${this.orderBy(query)}
      limit ${perPage} offset ${offset}
    `;

    const countQuery = sql`select count(*)::int as total ${this.from()} ${where}`;

    const [items, countRows, facets] = await Promise.all([
      timed("items", () => db.execute(itemsQuery)),
      timed("count", () => db.execute(countQuery)),
      timed("facets", () => this.facets(query)),
    ]);

    return {
      items: (items as unknown as Record<string, unknown>[]).map(toCard),
      total: Number((countRows as unknown as { total: number }[])[0]?.total ?? 0),
      facets,
    };
  }

  private async facets(query: SearchQuery): Promise<SearchFacets> {
    const group = async (dimension: Dimension, expr: SQL, label: SQL) => {
      const where = this.whereSql(this.conditions(query, dimension));
      const rows = await timed(`facet:${dimension}`, () =>
        db.execute(sql`
          select ${expr} as value, ${label} as label, count(*)::int as count
          ${this.from()} ${where}
          group by 1, 2 having ${expr} is not null order by count desc, 2 asc limit 40
        `),
      );
      return (rows as unknown as { value: string; label: string; count: number }[]).map((r) => ({
        value: r.value,
        label: r.label,
        count: Number(r.count),
      }));
    };

    const whereAll = this.whereSql(this.conditions(query));
    const [category, manufacturer, condition, country, saleMode, trustRows] = await Promise.all([
      group("category", sql`coalesce(parent.slug, c.slug)`, sql`coalesce(parent.name ->> 'de', c.name ->> 'de')`),
      group("manufacturer", sql`mf.slug`, sql`mf.name`),
      group("condition", sql`l.condition::text`, sql`l.condition::text`),
      group("country", sql`l.location_country`, sql`l.location_country`),
      group("saleMode", sql`l.sale_mode::text`, sql`l.sale_mode::text`),
      db.execute(sql`
        select
          count(*) filter (where l.verified_at is not null)::int as verified,
          count(*) filter (where l.warranty_months > 0)::int as warranty,
          min(l.price_cents)::int as min_price,
          max(l.price_cents)::int as max_price
        ${this.from()} ${whereAll}
      `),
    ]);

    const trust = (trustRows as unknown as {
      verified: number; warranty: number; min_price: number | null; max_price: number | null;
    }[])[0];

    return {
      category,
      manufacturer,
      condition,
      country,
      saleMode,
      trust: { verified: Number(trust?.verified ?? 0), warranty: Number(trust?.warranty ?? 0) },
      priceRange:
        trust?.min_price != null && trust?.max_price != null
          ? { minCents: Number(trust.min_price), maxCents: Number(trust.max_price) }
          : null,
    };
  }

  /**
   * Refreshes the denormalised haystack. The trigger keeps it current for
   * listing edits; this covers catalogue changes (a model or manufacturer was
   * renamed or merged) that the listing trigger cannot see.
   */
  async reindex(listingIds?: string[]): Promise<number> {
    const rows = listingIds?.length
      ? await sqlClient`
          update listings set search_text = listing_search_text(listings.*)
          where id = any(${sqlClient.array(listingIds)}::uuid[]) returning id`
      : await sqlClient`
          update listings set search_text = listing_search_text(listings.*) returning id`;
    return rows.length;
  }
}

function toCard(row: Record<string, unknown>): ListingCard {
  return {
    id: row.id as string,
    slug: row.slug as string,
    reference: row.reference as string,
    title: row.title as string,
    priceCents: Number(row.price_cents),
    currency: row.currency as ListingCard["currency"],
    condition: row.condition as ListingCard["condition"],
    year: row.year == null ? null : Number(row.year),
    operatingHours: row.operating_hours == null ? null : Number(row.operating_hours),
    locationCity: row.location_city as string,
    locationCountry: row.location_country as string,
    warrantyMonths: Number(row.warranty_months ?? 0),
    inspectedAt: row.inspected_at ? new Date(row.inspected_at as string) : null,
    verifiedAt: row.verified_at ? new Date(row.verified_at as string) : null,
    featured: Boolean(row.featured),
    publishedAt: row.published_at ? new Date(row.published_at as string) : null,
    imagePath: (row.image_path as string) ?? null,
    imageAlt: (row.image_alt as string) ?? null,
    modelName: row.model_name as string,
    modelSlug: row.model_slug as string,
    manufacturerName: row.manufacturer_name as string,
    categorySlug: row.category_slug as string,
    sellerName: row.seller_name as string,
    organisationName: (row.organisation_name as string) ?? null,
    organisationSlug: (row.organisation_slug as string) ?? null,
    organisationVerified: Boolean(row.organisation_verified),
  };
}

export const postgresSearch = new PostgresSearchProvider();

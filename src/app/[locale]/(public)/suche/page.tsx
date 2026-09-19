import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LayoutGrid, List, Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import { searchProvider } from "@/integrations/search";
import { hasAnyFilter, parseSearchParams, withParam, type RawParams } from "@/domain/search-params";
import { formatNumber } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { ButtonLink } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { FacetRail } from "@/ui/facet-rail";
import { ListingCardItem } from "@/ui/listing-card";
import { Pagination } from "@/ui/pagination";
import { cn } from "@/ui/cn";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "seo" });
  const q = typeof sp.q === "string" ? sp.q : undefined;
  return {
    title: q ? `${q} – ${t("searchTitle")}` : t("searchTitle"),
    description: t("defaultDescription"),
    // Filtered result pages are thin and near-duplicate; keep them out of the index.
    robots: hasAnyFilter(parseSearchParams(sp)) || q ? { index: false, follow: true } : undefined,
  };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawParams>;
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const sp = await searchParams;

  const t = await getTranslations({ locale, namespace: "search" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const th = await getTranslations({ locale, namespace: "humour" });

  const query = parseSearchParams(sp);
  const perPage = 24;
  const result = await searchProvider().search({ ...query, perPage });
  const basePath = `/${locale}/suche`;
  const layout = (typeof sp.ansicht === "string" ? sp.ansicht : "grid") === "list" ? "list" : "grid";
  const pageCount = Math.max(1, Math.ceil(result.total / perPage));

  const sortOptions = [
    { value: "relevance", label: t("sortRelevance") },
    { value: "newest", label: t("sortNewest") },
    { value: "price_asc", label: t("sortPriceAsc") },
    { value: "price_desc", label: t("sortPriceDesc") },
  ];
  const activeSort = query.sort ?? (query.q ? "relevance" : "newest");

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8">
      <form action={basePath} className="mb-6 flex max-w-2xl gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <input
            type="search"
            name="q"
            defaultValue={query.q ?? ""}
            aria-label={tc("search")}
            placeholder={tc("searchPlaceholder")}
            className="h-11 w-full rounded-[var(--radius-lg)] border border-border-strong bg-bg-elevated pl-10 pr-4 text-base text-fg focus:outline-2 focus:outline-[var(--ring)]"
          />
        </div>
        <button
          type="submit"
          className="h-11 rounded-[var(--radius-lg)] bg-primary px-5 font-medium text-primary-fg hover:bg-primary-hover"
        >
          {tc("search")}
        </button>
      </form>

      <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
        {/* Facet rail, after mockup S2: counts visible, other values stay reachable. */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="mb-3 flex items-center justify-between lg:mb-1">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              {t("facetCategory") === "Category" ? "Filters" : "Filter"}
            </h2>
            {hasAnyFilter(query) ? (
              <Link href={query.q ? `${basePath}?q=${encodeURIComponent(query.q)}` : basePath} className="text-xs text-primary hover:underline">
                {t("clearFilters")}
              </Link>
            ) : null}
          </div>
          <FacetRail facets={result.facets} params={sp} basePath={basePath} locale={locale} />
        </aside>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <h1 className="text-lg font-semibold">
              {query.q ? (
                <>
                  <span className="tabular">{formatNumber(result.total, locale)}</span> {t("resultsFor")}{" "}
                  <span className="text-primary">&ldquo;{query.q}&rdquo;</span>
                </>
              ) : (
                <>
                  <span className="tabular">{formatNumber(result.total, locale)}</span> {t("matchingItems")}
                </>
              )}
            </h1>

            <div className="flex items-center gap-3">
              <div className="flex rounded-[var(--radius-md)] border border-border p-0.5">
                {(["grid", "list"] as const).map((value) => (
                  <Link
                    key={value}
                    href={withParam(basePath, sp, "ansicht", value)}
                    aria-label={value}
                    aria-current={layout === value ? "true" : undefined}
                    className={cn(
                      "rounded-[var(--radius-sm)] p-1.5",
                      layout === value ? "bg-bg-sunken text-fg" : "text-fg-subtle hover:text-fg",
                    )}
                  >
                    {value === "grid" ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
                  </Link>
                ))}
              </div>
              <label className="flex items-center gap-1.5 text-sm text-fg-muted">
                <span className="hidden sm:inline">{t("sort")}:</span>
                <span className="flex gap-1">
                  {sortOptions.map((option) => (
                    <Link
                      key={option.value}
                      href={withParam(basePath, sp, "sort", option.value)}
                      className={cn(
                        "rounded-[var(--radius-sm)] px-2 py-1 text-xs",
                        activeSort === option.value
                          ? "bg-primary-subtle font-medium text-primary-subtle-fg"
                          : "text-fg-muted hover:bg-bg-subtle",
                      )}
                    >
                      {option.label}
                    </Link>
                  ))}
                </span>
              </label>
            </div>
          </div>

          {result.items.length === 0 ? (
            <EmptyState
              title={t("emptyTitle")}
              description={`${th("emptySearch")} ${t("emptyText")}`}
              action={
                <ButtonLink href={basePath} variant="secondary" size="sm">
                  {t("clearFilters")}
                </ButtonLink>
              }
            />
          ) : (
            <>
              <ul
                className={cn(
                  layout === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "space-y-3",
                )}
              >
                {result.items.map((listing) => (
                  <li key={listing.id}>
                    <ListingCardItem
                      listing={listing}
                      locale={locale}
                      layout={layout === "grid" ? "grid" : "row"}
                    />
                  </li>
                ))}
              </ul>
              <Pagination
                page={query.page ?? 1}
                pageCount={pageCount}
                hrefFor={(page) => withParam(basePath, sp, "seite", String(page))}
                labels={{
                  previous: tc("previous"),
                  next: tc("next"),
                  page: tc("page"),
                  of: tc("of"),
                }}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}

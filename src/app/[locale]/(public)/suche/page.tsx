import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeCheck, LayoutGrid, List, Search as SearchIcon, SlidersHorizontal, Sparkles, X } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { searchProvider, type ListingCard } from "@/integrations/search";
import { namesForSlugs } from "@/db/queries/catalogue";
import type { FacetValue } from "@/integrations/search/types";
import {
  hasAnyFilter,
  parseSearchParams,
  toggledHref,
  withoutParams,
  withParam,
  type RawParams,
} from "@/domain/search-params";
import { formatMoney, formatNumber } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { ButtonLink } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { FacetRail } from "@/ui/facet-rail";
import { FilterToggle } from "@/ui/filter-toggle";
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
  const tcond = await getTranslations({ locale, namespace: "conditions" });
  const tsale = await getTranslations({ locale, namespace: "saleMode" });

  const query = parseSearchParams(sp);
  const perPage = 24;
  const search = searchProvider();

  // The plain view of "Geräte entdecken" (nothing searched, filtered or
  // re-sorted) opens with the newest qualified and the newest listings. The
  // list below leaves those out on every page, so nothing appears twice and
  // the pages stay stable. Once someone narrows the list, it answers alone.
  const landing = !query.q && !hasAnyFilter(query) && (!query.sort || query.sort === "newest");
  const qualified = landing
    ? await search.search({ verifiedOnly: true, warrantyOnly: true, sort: "newest", perPage: 3 })
    : null;
  const newest = landing
    ? await search.search({ sort: "newest", perPage: 3, excludeIds: qualified?.items.map((l) => l.id) })
    : null;
  const highlighted = [...(qualified?.items ?? []), ...(newest?.items ?? [])].map((l) => l.id);
  const showHighlights = landing && (query.page ?? 1) === 1 && highlighted.length > 0;

  const result = await search.search({ ...query, perPage, excludeIds: highlighted });
  // The highlighted listings still belong to the set the heading counts.
  const matching = result.total + highlighted.length;
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

  // Every active filter as a chip that takes it away again.
  // A chosen manufacturer can drop out of the facet when a model narrows the list, so names come from the catalogue.
  const names = await namesForSlugs({ manufacturers: query.manufacturers, models: query.models });
  const labelOf = (values: FacetValue[], value: string) =>
    names.get(value) ?? values.find((f) => f.value === value)?.label ?? value;
  const range = (label: string, from?: string, to?: string) =>
    from && to ? t("rangeBetween", { label, from, to }) : from ? t("rangeFrom", { label, from }) : t("rangeTo", { label, to: to ?? "" });
  const facets = result.facets;
  const chips: { key: string; label: string; href: string }[] = [
    ...(query.category
      ? [{ key: "kategorie", label: labelOf(facets.category, query.category), href: toggledHref(basePath, sp, "kategorie", query.category, false) }]
      : []),
    ...(query.manufacturers ?? []).map((value) => ({
      key: `hersteller-${value}`,
      label: labelOf(facets.manufacturer, value),
      href: toggledHref(basePath, sp, "hersteller", value),
    })),
    ...(query.models ?? []).map((value) => ({
      key: `modell-${value}`,
      label: labelOf(facets.model, value),
      href: toggledHref(basePath, sp, "modell", value),
    })),
    ...(query.minPriceCents || query.maxPriceCents
      ? [
          {
            key: "preis",
            label: range(
              t("facetPrice"),
              query.minPriceCents ? formatMoney(query.minPriceCents, "CHF", locale) : undefined,
              query.maxPriceCents ? formatMoney(query.maxPriceCents, "CHF", locale) : undefined,
            ),
            href: withoutParams(basePath, sp, ["min", "max"]),
          },
        ]
      : []),
    ...(query.minYear || query.maxYear
      ? [
          {
            key: "baujahr",
            label: range(t("facetYear"), query.minYear?.toString(), query.maxYear?.toString()),
            href: withoutParams(basePath, sp, ["baujahr_von", "baujahr_bis"]),
          },
        ]
      : []),
    ...(query.condition ?? []).map((value) => ({
      key: `zustand-${value}`,
      label: tcond(value),
      href: toggledHref(basePath, sp, "zustand", value),
    })),
    ...(query.country ?? []).map((value) => ({
      key: `land-${value}`,
      label: value,
      href: toggledHref(basePath, sp, "land", value),
    })),
    ...(query.saleMode ?? []).map((value) => ({
      key: `art-${value}`,
      label: tsale(value),
      href: toggledHref(basePath, sp, "art", value),
    })),
    ...(query.verifiedOnly
      ? [{ key: "geprueft", label: t("verifiedOnly"), href: toggledHref(basePath, sp, "geprueft", "1", false) }]
      : []),
    ...(query.warrantyOnly
      ? [{ key: "garantie", label: t("warrantyOnly"), href: toggledHref(basePath, sp, "garantie", "1", false) }]
      : []),
  ];

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
        {/* Sticky on a wide screen, and scrolling on its own when it is taller than the window. */}
        <aside className="lg:sticky lg:top-30 lg:max-h-[calc(100vh-8.5rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <FilterToggle label={t("filters")} active={chips.length}>
            <div className="mb-3 flex items-center justify-between lg:mb-1">
              <h2 className="hidden items-center gap-1.5 text-sm font-semibold lg:flex">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                {t("filters")}
              </h2>
              {hasAnyFilter(query) ? (
                <Link
                  href={query.q ? `${basePath}?q=${encodeURIComponent(query.q)}` : basePath}
                  className="text-xs text-primary hover:underline"
                >
                  {t("clearFilters")}
                </Link>
              ) : null}
            </div>
            <FacetRail facets={result.facets} params={sp} basePath={basePath} locale={locale} />
          </FilterToggle>
        </aside>

        {/* min-w-0 keeps a long row inside the column instead of widening the page. */}
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <h1 className="text-lg font-semibold">
              {query.q ? (
                <>
                  <span className="tabular">{formatNumber(matching, locale)}</span> {t("resultsFor")}{" "}
                  <span className="text-primary">&ldquo;{query.q}&rdquo;</span>
                </>
              ) : (
                <>
                  <span className="tabular">{formatNumber(matching, locale)}</span> {t("matchingItems")}
                </>
              )}
            </h1>

            <div className="flex flex-wrap items-center gap-3">
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
                <span className="flex flex-wrap gap-1">
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

          {chips.length ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-fg-subtle">{t("activeFilters")}:</span>
              {chips.map((chip) => (
                <Link
                  key={chip.key}
                  href={chip.href}
                  aria-label={t("removeFilter", { label: chip.label })}
                  className="inline-flex items-center gap-1 rounded-[var(--radius-full)] border border-border bg-bg-elevated px-2.5 py-0.5 text-xs text-fg transition-colors hover:border-[var(--primary)]"
                >
                  {chip.label}
                  <X className="size-3 text-fg-subtle" aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : null}

          {showHighlights ? (
            <div className="mb-8 space-y-4">
              {qualified && qualified.items.length > 0 ? (
                <Highlight
                  icon={BadgeCheck}
                  title={t("highlightQualified")}
                  items={qualified.items}
                  locale={locale}
                  action={
                    <Link
                      href={`/${locale}/qualifizierte-geraete`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {t("highlightQualifiedAll")} →
                    </Link>
                  }
                />
              ) : null}
              {newest && newest.items.length > 0 ? (
                <Highlight icon={Sparkles} title={t("highlightNewest")} items={newest.items} locale={locale} />
              ) : null}
              {result.items.length > 0 ? (
                <h2 className="pt-4 text-lg font-semibold">{t("moreItems")}</h2>
              ) : null}
            </div>
          ) : null}

          {result.items.length === 0 && showHighlights ? null : result.items.length === 0 ? (
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

/** A short row of listings set apart from the list, always as cards. */
function Highlight({
  icon: Icon,
  title,
  items,
  locale,
  action,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  items: ListingCard[];
  locale: Locale;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-bg-subtle p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
          <Icon className="size-4 text-primary" aria-hidden />
          {title}
        </h2>
        {action}
      </div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {items.map((listing) => (
          <li key={listing.id}>
            <ListingCardItem listing={listing} locale={locale} />
          </li>
        ))}
      </ul>
    </section>
  );
}

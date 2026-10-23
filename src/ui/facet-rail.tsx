import Link from "next/link";
import { useTranslations } from "next-intl";
import type { SearchFacets } from "@/integrations/search";
import type { RawParams } from "@/domain/search-params";
import { paramsExcept, toggledHref } from "@/domain/search-params";
import { formatNumber } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { buttonClass } from "./button";
import { cn } from "./cn";

type Facet = { value: string; label: string; count: number };

function FacetLink({
  facet,
  isOn,
  href,
  label,
  locale,
}: {
  facet: Facet;
  isOn: boolean;
  href: string;
  label: string;
  locale: Locale;
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex items-center justify-between gap-2 rounded-[var(--radius-sm)] px-1.5 py-1 text-sm transition-colors",
          isOn ? "bg-primary-subtle font-medium text-primary-subtle-fg" : "text-fg-muted hover:bg-bg-subtle",
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn(
              "size-3.5 shrink-0 rounded-[3px] border",
              isOn ? "border-[var(--primary)] bg-primary" : "border-border-strong",
            )}
          />
          <span className="truncate">{label}</span>
        </span>
        <span className="tabular shrink-0 text-xs text-fg-subtle">{formatNumber(facet.count, locale)}</span>
      </Link>
    </li>
  );
}

function FacetGroup({
  title,
  values,
  paramKey,
  basePath,
  params,
  locale,
  labelFor,
  showAll,
  multi = true,
  limit = 8,
}: {
  title: string;
  values: Facet[];
  paramKey: string;
  basePath: string;
  params: RawParams;
  locale: Locale;
  labelFor?: (value: string, label: string) => string;
  /** Label for revealing the values beyond the limit, given their number. */
  showAll?: (count: number) => string;
  multi?: boolean;
  limit?: number;
}) {
  if (!values.length) return null;
  const selected = new Set(
    String(params[paramKey] ?? "")
      .split(",")
      .filter(Boolean),
  );
  // Chosen values stay in view even when they would fall below the limit.
  const first = values.filter((facet, index) => index < limit || selected.has(facet.value));
  const rest = values.filter((facet, index) => index >= limit && !selected.has(facet.value));
  const link = (facet: Facet) => (
    <FacetLink
      key={facet.value}
      facet={facet}
      isOn={selected.has(facet.value)}
      href={toggledHref(basePath, params, paramKey, facet.value, multi)}
      label={labelFor ? labelFor(facet.value, facet.label) : facet.label}
      locale={locale}
    />
  );

  return (
    <div className="border-b border-border py-4 first:pt-0 last:border-b-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">{title}</h3>
      <ul className="space-y-0.5">{first.map(link)}</ul>
      {rest.length && showAll ? (
        <details className="mt-1">
          <summary className="cursor-pointer list-none px-1.5 py-1 text-xs font-medium text-primary hover:underline [&::-webkit-details-marker]:hidden">
            {showAll(values.length)}
          </summary>
          <ul className="mt-0.5 space-y-0.5">{rest.map(link)}</ul>
        </details>
      ) : null}
    </div>
  );
}

/** Two numbers, "from" and "to", sent with every other filter kept. */
function RangeGroup({
  title,
  fromKey,
  toKey,
  params,
  basePath,
  placeholders,
  labels,
}: {
  title: string;
  fromKey: string;
  toKey: string;
  params: RawParams;
  basePath: string;
  placeholders: { from?: string; to?: string };
  labels: { from: string; to: string; apply: string };
}) {
  const value = (key: string) => {
    const v = params[key];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const input = (key: string, label: string, placeholder?: string) => (
    <label className="min-w-0 flex-1">
      <span className="mb-0.5 block text-xs text-fg-subtle">{label}</span>
      <input
        name={key}
        inputMode="numeric"
        defaultValue={value(key)}
        placeholder={placeholder}
        className="h-8 w-full rounded-[var(--radius-sm)] border border-border-strong bg-bg-elevated px-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-2 focus:outline-[var(--ring)]"
      />
    </label>
  );

  return (
    <div className="border-b border-border py-4 first:pt-0 last:border-b-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">{title}</h3>
      <form action={basePath} className="flex items-end gap-1.5">
        {paramsExcept(params, [fromKey, toKey]).map(([key, v]) => (
          <input key={key} type="hidden" name={key} value={v} />
        ))}
        {input(fromKey, labels.from, placeholders.from)}
        {input(toKey, labels.to, placeholders.to)}
        <button type="submit" className={buttonClass("secondary", "sm", "shrink-0")}>
          {labels.apply}
        </button>
      </form>
    </div>
  );
}

export function FacetRail({
  facets,
  params,
  basePath,
  locale,
}: {
  facets: SearchFacets;
  params: RawParams;
  basePath: string;
  locale: Locale;
}) {
  const t = useTranslations("search");
  const tc = useTranslations("conditions");
  const ts = useTranslations("saleMode");
  const rangeLabels = { from: t("priceFrom"), to: t("priceTo"), apply: t("apply") };
  const francs = (cents: number) => formatNumber(Math.round(cents / 100), locale);

  return (
    <div className="space-y-0 text-sm">
      <FacetGroup
        title={t("facetCategory")}
        values={facets.category}
        paramKey="kategorie"
        basePath={basePath}
        params={params}
        locale={locale}
        multi={false}
        showAll={(count) => t("showAll", { count })}
      />
      <FacetGroup
        title={t("facetManufacturer")}
        values={facets.manufacturer}
        paramKey="hersteller"
        basePath={basePath}
        params={params}
        locale={locale}
        limit={8}
        showAll={(count) => t("showAll", { count })}
      />
      <FacetGroup
        title={t("facetModel")}
        values={facets.model}
        paramKey="modell"
        basePath={basePath}
        params={params}
        locale={locale}
        limit={6}
        showAll={(count) => t("showAll", { count })}
      />
      <RangeGroup
        title={t("facetPriceChf")}
        fromKey="min"
        toKey="max"
        params={params}
        basePath={basePath}
        placeholders={{
          from: facets.priceRange ? francs(facets.priceRange.minCents) : undefined,
          to: facets.priceRange ? francs(facets.priceRange.maxCents) : undefined,
        }}
        labels={rangeLabels}
      />
      <RangeGroup
        title={t("facetYear")}
        fromKey="baujahr_von"
        toKey="baujahr_bis"
        params={params}
        basePath={basePath}
        placeholders={{
          from: facets.yearRange ? String(facets.yearRange.min) : undefined,
          to: facets.yearRange ? String(facets.yearRange.max) : undefined,
        }}
        labels={rangeLabels}
      />
      <FacetGroup
        title={t("facetCondition")}
        values={facets.condition}
        paramKey="zustand"
        basePath={basePath}
        params={params}
        locale={locale}
        labelFor={(value) => tc(value)}
      />
      <FacetGroup
        title={t("facetCountry")}
        values={facets.country}
        paramKey="land"
        basePath={basePath}
        params={params}
        locale={locale}
      />
      <FacetGroup
        title={t("facetSaleMode")}
        values={facets.saleMode}
        paramKey="art"
        basePath={basePath}
        params={params}
        locale={locale}
        labelFor={(value) => ts(value)}
      />
      <FacetGroup
        title={t("facetTrust")}
        values={[{ value: "1", label: t("verifiedOnly"), count: facets.trust.verified }]}
        paramKey="geprueft"
        basePath={basePath}
        params={params}
        locale={locale}
        multi={false}
      />
      <FacetGroup
        title=" "
        values={[{ value: "1", label: t("warrantyOnly"), count: facets.trust.warranty }]}
        paramKey="garantie"
        basePath={basePath}
        params={params}
        locale={locale}
        multi={false}
      />
    </div>
  );
}

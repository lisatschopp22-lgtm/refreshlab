import Link from "next/link";
import { useTranslations } from "next-intl";
import type { SearchFacets } from "@/integrations/search";
import type { RawParams } from "@/domain/search-params";
import { toggledHref } from "@/domain/search-params";
import { formatNumber } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { cn } from "./cn";

function FacetGroup({
  title,
  values,
  paramKey,
  basePath,
  params,
  locale,
  labelFor,
  multi = true,
  limit = 8,
}: {
  title: string;
  values: { value: string; label: string; count: number }[];
  paramKey: string;
  basePath: string;
  params: RawParams;
  locale: Locale;
  labelFor?: (value: string, label: string) => string;
  multi?: boolean;
  limit?: number;
}) {
  if (!values.length) return null;
  const selected = new Set(
    String(params[paramKey] ?? "")
      .split(",")
      .filter(Boolean),
  );
  const shown = values.slice(0, limit);

  return (
    <div className="border-b border-border py-4 first:pt-0 last:border-b-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">{title}</h3>
      <ul className="space-y-0.5">
        {shown.map((facet) => {
          const isOn = selected.has(facet.value);
          return (
            <li key={facet.value}>
              <Link
                href={toggledHref(basePath, params, paramKey, facet.value, multi)}
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
                  <span className="truncate">{labelFor ? labelFor(facet.value, facet.label) : facet.label}</span>
                </span>
                <span className="tabular shrink-0 text-xs text-fg-subtle">
                  {formatNumber(facet.count, locale)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
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
        title={t("facetManufacturer")}
        values={facets.manufacturer}
        paramKey="hersteller"
        basePath={basePath}
        params={params}
        locale={locale}
        multi={false}
        limit={10}
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
        values={[
          { value: "1", label: t("verifiedOnly"), count: facets.trust.verified },
        ]}
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

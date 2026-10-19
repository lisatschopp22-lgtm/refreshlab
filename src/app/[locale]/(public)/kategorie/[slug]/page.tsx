import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getCategoryById,
  getCategoryBySlug,
  listChildCategories,
  listModelsForCategory,
} from "@/db/queries/catalogue";
import { searchProvider } from "@/integrations/search";
import { parseSearchParams, type RawParams } from "@/domain/search-params";
import { formatNumber, pick } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { Badge } from "@/ui/badge";
import { ButtonLink } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { JsonLd, breadcrumbLd } from "@/ui/json-ld";
import { ListingCardItem } from "@/ui/listing-card";
import { Section } from "@/ui/card";
import { StorageImage } from "@/ui/storage-image";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category || category.kind !== "equipment") return {};
  const t = await getTranslations({ locale, namespace: "seo" });
  const name = pick(category.name, locale as Locale);
  return {
    title: t("categoryTitle", { name }),
    description: pick(category.intro, locale as Locale) || t("defaultDescription"),
    alternates: { canonical: `${siteUrl}/${locale}/kategorie/${slug}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<RawParams>;
}) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const sp = await searchParams;

  const category = await getCategoryBySlug(slug);
  // Consumables are a taxonomy without models; they live on their own page.
  if (!category || category.kind !== "equipment") notFound();

  const t = await getTranslations({ locale, namespace: "category" });
  const tm = await getTranslations({ locale, namespace: "model" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const tn = await getTranslations({ locale, namespace: "nav" });

  const query = parseSearchParams(sp);
  const [listings, models, parent, children] = await Promise.all([
    searchProvider().search({ ...query, category: slug, perPage: 12, sort: query.sort ?? "newest" }),
    listModelsForCategory(category.id),
    category.parentId ? getCategoryById(category.parentId) : null,
    listChildCategories(category.id),
  ]);

  const name = pick(category.name, locale);
  const breadcrumbs = [
    { name: "refreshLab", href: `/${locale}` },
    { name: t("title"), href: `/${locale}/katalog` },
    ...(parent ? [{ name: pick(parent.name, locale), href: `/${locale}/kategorie/${parent.slug}` }] : []),
    { name, href: `/${locale}/kategorie/${slug}` },
  ];

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6">
      <JsonLd data={breadcrumbLd(breadcrumbs.map((b) => ({ name: b.name, url: `${siteUrl}${b.href}` })))} />
      <Breadcrumbs items={breadcrumbs} />

      <header className="max-w-3xl space-y-3 border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
        {/* A device type borrows its parent's introduction. */}
        <p className="leading-relaxed text-fg-muted">{pick(category.intro ?? parent?.intro, locale)}</p>
        <p className="flex gap-4 text-sm text-fg-subtle">
          <span className="tabular">
            {formatNumber(listings.total, locale)} {t("offers")}
          </span>
          <span className="tabular">
            {formatNumber(models.length, locale)} {t("models")}
          </span>
        </p>
      </header>

      {children.length > 0 ? (
        <nav aria-label={t("types")} className="space-y-2 pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">{t("types")}</h2>
          <ul className="flex flex-wrap gap-2">
            {children.map((child) => (
              <li key={child.id}>
                <Link
                  href={`/${locale}/kategorie/${child.slug}`}
                  className="inline-flex items-center gap-2 rounded-[var(--radius-full)] border border-border bg-bg-elevated px-3 py-1.5 text-sm text-fg transition-colors hover:border-[var(--primary)]"
                >
                  {pick(child.name, locale)}
                  {child.listingCount > 0 ? (
                    <span className="tabular text-xs text-fg-subtle">{formatNumber(child.listingCount, locale)}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <div className="space-y-12 py-8">
        <Section
          title={t("offers")}
          action={
            <Link href={`/${locale}/suche?kategorie=${slug}`} className="text-sm text-primary hover:underline">
              {tc("allWithFilters")} →
            </Link>
          }
        >
          {listings.items.length === 0 ? (
            <EmptyState
              title={t("emptyOffers")}
              action={
                <ButtonLink href={`/${locale}/verkaufen`} variant="secondary" size="sm">
                  {tn("sell")}
                </ButtonLink>
              }
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {listings.items.map((listing) => (
                <li key={listing.id}>
                  <ListingCardItem listing={listing} locale={locale} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* The knowledge base side: models exist whether or not anything is for sale. */}
        {models.length > 0 ? (
        <Section title={tm("record")} description={`${models.length} ${t("models")} ${t("inCategory")}`}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((model) => (
              <li key={model.id}>
                <Link
                  href={`/${locale}/modell/${model.slug}`}
                  className="flex h-full gap-3 rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-3 transition-colors hover:border-[var(--primary)]"
                >
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-bg-sunken">
                    <StorageImage path={model.imagePath} alt="" sizes="64px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">
                      {model.manufacturerName} {model.name}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-fg-muted">
                      {pick(model.summary, locale)}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5">
                      <Badge tone={model.listingCount > 0 ? "primary" : "neutral"}>
                        {model.listingCount} {t("offers")}
                      </Badge>
                      {model.discontinued ? <Badge tone="outline">EOL</Badge> : null}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
        ) : null}
      </div>
    </main>
  );
}

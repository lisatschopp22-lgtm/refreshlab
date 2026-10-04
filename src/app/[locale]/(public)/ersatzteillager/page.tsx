import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { searchProvider } from "@/integrations/search";
import { formatNumber } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { Section } from "@/ui/card";
import { EmptyState } from "@/ui/empty-state";
import { JsonLd, breadcrumbLd } from "@/ui/json-ld";
import { ListingCardItem } from "@/ui/listing-card";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "parts" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: `${siteUrl}/${locale}/ersatzteillager` },
  };
}

export default async function PartsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "parts" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const tcat = await getTranslations({ locale, namespace: "category" });

  // The store is a view, not a listing type: everything declared defective and sold for parts.
  const listings = await searchProvider().search({ condition: ["for_parts"], perPage: 12, sort: "newest" });

  const breadcrumbs = [
    { name: "refreshLab", href: `/${locale}` },
    { name: t("title"), href: `/${locale}/ersatzteillager` },
  ];

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6">
      <JsonLd data={breadcrumbLd(breadcrumbs.map((b) => ({ name: b.name, url: `${siteUrl}${b.href}` })))} />
      <Breadcrumbs items={breadcrumbs} />

      <header className="max-w-3xl space-y-3 border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="leading-relaxed text-fg-muted">{t("lead")}</p>
        <p className="leading-relaxed text-fg-muted">{t("text")}</p>
        <p className="tabular text-sm text-fg-subtle">
          {formatNumber(listings.total, locale)} {tcat("offers")}
        </p>
      </header>

      <div className="py-8">
        <Section
          title={t("listingsTitle")}
          action={
            <Link href={`/${locale}/suche?zustand=for_parts`} className="text-sm text-primary hover:underline">
              {tc("allWithFilters")} →
            </Link>
          }
        >
          {listings.items.length === 0 ? (
            <EmptyState title={t("emptyTitle")} description={t("emptyText")} />
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
      </div>
    </main>
  );
}

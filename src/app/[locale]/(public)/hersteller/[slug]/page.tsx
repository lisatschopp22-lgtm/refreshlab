import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getManufacturerBySlug, listModelsForManufacturer } from "@/db/queries/catalogue";
import { searchProvider } from "@/integrations/search";
import { formatNumber, pick } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { Breadcrumbs } from "@/ui/breadcrumbs";
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
  const manufacturer = await getManufacturerBySlug(slug);
  if (manufacturer?.status !== "published") return {};
  const t = await getTranslations({ locale, namespace: "seo" });
  return {
    title: t("manufacturerTitle", { name: manufacturer.name }),
    description: t("defaultDescription"),
    alternates: { canonical: `${siteUrl}/${locale}/hersteller/${slug}` },
  };
}

export default async function ManufacturerPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const manufacturer = await getManufacturerBySlug(slug);
  // Unchecked or merged manufacturers are not public.
  if (!manufacturer || manufacturer.status !== "published") notFound();

  const t = await getTranslations({ locale, namespace: "manufacturer" });
  const tc = await getTranslations({ locale, namespace: "category" });

  const [models, listings] = await Promise.all([
    listModelsForManufacturer(manufacturer.id),
    searchProvider().search({ manufacturers: [slug], perPage: 8, sort: "newest" }),
  ]);

  const breadcrumbs = [
    { name: "refreshLab", href: `/${locale}` },
    { name: t("title"), href: `/${locale}/katalog` },
    { name: manufacturer.name, href: `/${locale}/hersteller/${slug}` },
  ];

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: manufacturer.name,
            url: manufacturer.website ?? undefined,
            address: manufacturer.country ? { "@type": "PostalAddress", addressCountry: manufacturer.country } : undefined,
          },
          breadcrumbLd(breadcrumbs.map((b) => ({ name: b.name, url: `${siteUrl}${b.href}` }))),
        ]}
      />
      <Breadcrumbs items={breadcrumbs} />

      <header className="max-w-3xl space-y-2 border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight">{manufacturer.name}</h1>
        <p className="tabular flex gap-4 text-sm text-fg-muted">
          <span>
            {formatNumber(models.length, locale)} {t("models")}
          </span>
          <span>
            {formatNumber(listings.total, locale)} {t("listings")}
          </span>
          {manufacturer.country ? <span>{manufacturer.country}</span> : null}
        </p>
      </header>

      <div className="space-y-12 py-8">
        {listings.items.length ? (
          <Section
            title={t("listings")}
            action={
              <Link href={`/${locale}/suche?hersteller=${slug}`} className="text-sm text-primary hover:underline">
                {locale === "de" ? "Alle mit Filtern" : "All with filters"} →
              </Link>
            }
          >
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {listings.items.map((listing) => (
                <li key={listing.id}>
                  <ListingCardItem listing={listing} locale={locale} />
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section title={t("allModels", { name: manufacturer.name })}>
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
                    <p className="truncate text-sm font-medium text-fg">{model.name}</p>
                    <p className="mt-0.5 text-xs text-fg-subtle">{pick(model.categoryName, locale)}</p>
                    <p className="mt-1">
                      <Badge tone={model.listingCount > 0 ? "primary" : "neutral"}>
                        {model.listingCount} {tc("offers")}
                      </Badge>
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeCheck, Puzzle } from "lucide-react";
import { getModelBySlug, modelPriceRange } from "@/db/queries/catalogue";
import { searchProvider } from "@/integrations/search";
import { formatMoney, formatNumber, pick } from "@/i18n/format";
import { flagsFromEnv } from "@/domain/flags";
import type { Locale } from "@/i18n/routing";
import { storageUrl, StorageImage } from "@/ui/storage-image";
import { Badge } from "@/ui/badge";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { Card, CardBody, CardHeader } from "@/ui/card";
import { EmptyState } from "@/ui/empty-state";
import { JsonLd, breadcrumbLd } from "@/ui/json-ld";
import { ListingCardItem } from "@/ui/listing-card";
import { Table, Td, Th } from "@/ui/table";
import { CommentSection } from "@/ui/comment-section";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await getModelBySlug(slug);
  if (!data) return {};
  const title = `${data.manufacturer.name} ${data.model.name}`;
  return {
    title,
    description: pick(data.model.summary, locale as Locale),
    alternates: { canonical: `${siteUrl}/${locale}/modell/${slug}` },
    openGraph: {
      title,
      description: pick(data.model.summary, locale as Locale),
      images: data.model.imagePath ? [{ url: storageUrl(data.model.imagePath)! }] : undefined,
    },
  };
}

export default async function ModelPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const data = await getModelBySlug(slug);
  if (!data || data.model.status === "merged") notFound();
  const { model, manufacturer, category } = data;

  const t = await getTranslations({ locale, namespace: "model" });
  const tl = await getTranslations({ locale, namespace: "listing" });
  const flags = flagsFromEnv();

  const [listings, priceRange] = await Promise.all([
    searchProvider().search({ modelId: model.id, perPage: 12, sort: "price_asc" }),
    modelPriceRange(model.id),
  ]);

  const breadcrumbs = [
    { name: "refreshLab", href: `/${locale}` },
    { name: pick(category.name, locale), href: `/${locale}/kategorie/${category.slug}` },
    { name: manufacturer.name, href: `/${locale}/hersteller/${manufacturer.slug}` },
    { name: model.name, href: `/${locale}/modell/${model.slug}` },
  ];

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${manufacturer.name} ${model.name}`,
    description: pick(model.summary, locale),
    brand: { "@type": "Brand", name: manufacturer.name },
    model: model.name,
    image: model.imagePath ? [storageUrl(model.imagePath)] : undefined,
    ...(priceRange
      ? {
          offers: {
            "@type": "AggregateOffer",
            offerCount: priceRange.count,
            lowPrice: (priceRange.minCents / 100).toFixed(2),
            highPrice: (priceRange.maxCents / 100).toFixed(2),
            priceCurrency: "CHF",
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  };

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6">
      <JsonLd
        data={[productLd, breadcrumbLd(breadcrumbs.map((b) => ({ name: b.name, url: `${siteUrl}${b.href}` })))]}
      />
      <Breadcrumbs items={breadcrumbs} />

      {/* Academic dossier framing, after mockup S3: this is a record, not an advert. */}
      <header className="border-b border-border pb-6">
        <p className="tabular text-xs uppercase tracking-[0.18em] text-fg-subtle">
          REFRESHLAB EQUIPMENT RECORD · {model.recordNumber} · REV. {model.revision}
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight">
              {manufacturer.name} {model.name}
            </h1>
            <p className="mt-2 leading-relaxed text-fg-muted">{pick(model.summary, locale)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {model.manufacturerVerifiedAt ? (
                <Badge tone="success">
                  <BadgeCheck className="size-3" aria-hidden="true" />
                  {t("manufacturerVerified")}
                </Badge>
              ) : (
                <Badge tone="outline">{t("communityData")}</Badge>
              )}
              {model.discontinued ? <Badge tone="warning">{t("discontinued")}</Badge> : null}
              <Badge tone="neutral">
                {t("introduced")} {model.yearIntroduced}
              </Badge>
            </div>
          </div>
          {model.imagePath ? (
            <div className="relative aspect-[4/3] w-64 shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-bg-sunken">
              <StorageImage path={model.imagePath} alt={`${manufacturer.name} ${model.name}`} sizes="256px" />
            </div>
          ) : null}
        </div>
      </header>

      <div className="grid gap-8 py-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{t("overview")}</h2>
            <p className="max-w-3xl leading-relaxed text-fg-muted">{pick(model.description, locale)}</p>
          </section>

          {model.accessories.length ? (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Puzzle className="size-4 text-fg-subtle" aria-hidden="true" />
                {t("accessories")}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {model.accessories.map((accessory) => (
                  <li key={accessory}>
                    <Badge tone="outline">{accessory}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{t("specifications")}</h2>
            <Table>
              <thead>
                <tr>
                  <Th className="w-1/2">{t("specifications")}</Th>
                  <Th>{locale === "de" ? "Wert" : "Value"}</Th>
                </tr>
              </thead>
              <tbody>
                {(category.specSchema ?? []).map((field) => {
                  const value = model.specs?.[field.key];
                  if (value === undefined || value === null || value === "") return null;
                  return (
                    <tr key={field.key}>
                      <Td className="text-fg-muted">{pick(field.label, locale)}</Td>
                      <Td className="tabular">
                        {typeof value === "number" ? formatNumber(value, locale) : String(value)}
                        {field.unit ? ` ${field.unit}` : ""}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </section>

          <CommentSection
            locale={locale}
            targetType="model"
            targetId={model.id}
            path={`/${locale}/modell/${model.slug}`}
          />

          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-lg font-semibold">{t("listingsForModel")}</h2>
              <Link href={`/${locale}/suche?q=${encodeURIComponent(model.name)}`} className="text-sm text-primary hover:underline">
                {tl("relatedListings")} →
              </Link>
            </div>
            {listings.items.length ? (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {listings.items.map((listing) => (
                  <li key={listing.id}>
                    <ListingCardItem listing={listing} locale={locale} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={t("noListings")} />
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {flags.showPriceRangeOnModel && priceRange ? (
            <Card>
              <CardHeader title={t("market")} />
              <CardBody className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-fg-subtle">{t("priceRange")}</p>
                  <p className="tabular text-xl font-semibold text-fg">
                    {formatMoney(priceRange.minCents, "CHF", locale)} – {formatMoney(priceRange.maxCents, "CHF", locale)}
                  </p>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-fg-subtle">{locale === "de" ? "Median" : "Median"}</p>
                  <p className="tabular font-medium text-fg">
                    {formatMoney(priceRange.medianCents, "CHF", locale)}
                  </p>
                </div>
                <p className="text-xs text-fg-subtle">{t("priceRangeNote", { count: priceRange.count })}</p>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title={t("record")} />
            <CardBody className="space-y-2 text-sm">
              <dl className="space-y-2">
                <div className="flex justify-between gap-2">
                  <dt className="text-fg-subtle">{locale === "de" ? "Hersteller" : "Manufacturer"}</dt>
                  <dd>
                    <Link href={`/${locale}/hersteller/${manufacturer.slug}`} className="text-primary hover:underline">
                      {manufacturer.name}
                    </Link>
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-fg-subtle">{locale === "de" ? "Kategorie" : "Category"}</dt>
                  <dd>
                    <Link href={`/${locale}/kategorie/${category.slug}`} className="text-primary hover:underline">
                      {pick(category.name, locale)}
                    </Link>
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-fg-subtle">{t("record")}</dt>
                  <dd className="tabular">{model.recordNumber}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-fg-subtle">{t("revision")}</dt>
                  <dd className="tabular">{model.revision}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>
        </aside>
      </div>
    </main>
  );
}

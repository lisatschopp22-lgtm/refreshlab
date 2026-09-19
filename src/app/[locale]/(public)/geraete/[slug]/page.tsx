import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, FileText, Gauge, MapPin, MessageSquare, Share2, ShieldCheck } from "lucide-react";
import { getListingBySlug, relatedListings } from "@/db/queries/listings";
import { modelPriceRange } from "@/db/queries/catalogue";
import { conditionGrade } from "@/domain/conditions";
import { flagsFromEnv } from "@/domain/flags";
import { formatDate, formatMoney, formatNumber, pick } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { storageUrl } from "@/ui/storage-image";
import { Badge } from "@/ui/badge";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { Button, ButtonLink } from "@/ui/button";
import { WatchButton } from "@/ui/watch-button";
import { CommentSection } from "@/ui/comment-section";
import { startConversationAction } from "@/actions/community";
import { buttonClass } from "@/ui/button";
import { Card, CardBody, CardHeader } from "@/ui/card";
import { Gallery } from "@/ui/gallery";
import { JsonLd, breadcrumbLd } from "@/ui/json-ld";
import { Table, Td, Th } from "@/ui/table";
import { ClaimSource, ConditionBadge, LocationLine, VerifiedBadge, WarrantyBadge } from "@/ui/trust";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await getListingBySlug(slug);
  if (!data) return {};
  const { listing, model, manufacturer } = data;
  const price = formatMoney(listing.priceCents, listing.currency, locale as Locale);
  const description = `${manufacturer.name} ${model.name}, ${listing.year ?? ""} · ${price} · ${listing.locationCity}. ${listing.conditionNotes ?? ""}`.slice(0, 300);

  return {
    title: listing.title,
    description,
    alternates: { canonical: `${siteUrl}/${locale}/geraete/${listing.slug}` },
    openGraph: {
      type: "website",
      title: listing.title,
      description,
      images: data.images[0] ? [{ url: storageUrl(data.images[0].storagePath)! }] : undefined,
    },
    robots: listing.status === "active" ? undefined : { index: false, follow: true },
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const data = await getListingBySlug(slug);
  if (!data || data.listing.status === "draft") notFound();

  const { listing, model, manufacturer, category, seller, organisation, images, attachments, sellerStats } = data;
  const t = await getTranslations({ locale, namespace: "listing" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const tm = await getTranslations({ locale, namespace: "model" });
  const tcond = await getTranslations({ locale, namespace: "conditions" });
  const flags = flagsFromEnv();

  const [related, priceRange] = await Promise.all([
    relatedListings(listing.id, listing.modelId, category.id, 4),
    modelPriceRange(listing.modelId),
  ]);

  const specFields = category.specSchema ?? [];
  const isBuyable = listing.status === "active";

  const breadcrumbs = [
    { name: "refreshLab", href: `/${locale}` },
    { name: pick(category.name, locale), href: `/${locale}/kategorie/${category.slug}` },
    { name: manufacturer.name, href: `/${locale}/hersteller/${manufacturer.slug}` },
    { name: listing.title, href: `/${locale}/geraete/${listing.slug}` },
  ];

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.conditionNotes ?? listing.description,
    sku: listing.reference,
    category: pick(category.name, "en"),
    image: images.map((image) => storageUrl(image.storagePath)).filter(Boolean),
    brand: { "@type": "Brand", name: manufacturer.name },
    model: model.name,
    productionDate: listing.year ? String(listing.year) : undefined,
    itemCondition:
      listing.condition === "new"
        ? "https://schema.org/NewCondition"
        : listing.condition === "for_parts"
          ? "https://schema.org/DamagedCondition"
          : "https://schema.org/UsedCondition",
    offers: {
      "@type": "Offer",
      price: (listing.priceCents / 100).toFixed(2),
      priceCurrency: listing.currency,
      availability: isBuyable
        ? "https://schema.org/InStock"
        : listing.status === "sold"
          ? "https://schema.org/SoldOut"
          : "https://schema.org/OutOfStock",
      itemCondition:
        listing.condition === "new" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
      url: `${siteUrl}/${locale}/geraete/${listing.slug}`,
      seller: {
        "@type": organisation ? "Organization" : "Person",
        name: organisation?.name ?? seller.displayName,
      },
      areaServed: listing.locationCountry,
    },
  };

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6">
      <JsonLd
        data={[
          productLd,
          breadcrumbLd(breadcrumbs.map((b) => ({ name: b.name, url: `${siteUrl}${b.href}` }))),
        ]}
      />
      <Breadcrumbs items={breadcrumbs} />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <Gallery images={images} title={listing.title} />

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{t("conditionAndScope")}</h2>
            <Card>
              <CardBody className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">
                    <span className="tabular font-semibold">{conditionGrade[listing.condition]}</span>
                    {tcond(listing.condition)}
                  </Badge>
                  <ClaimSource inspected={!!listing.inspectedAt} />
                </div>
                <p className="leading-relaxed text-fg-muted">{listing.conditionNotes}</p>
                {listing.scopeOfDelivery ? (
                  <p className="leading-relaxed text-fg-muted">{listing.scopeOfDelivery}</p>
                ) : null}
                {listing.description ? (
                  <p className="leading-relaxed text-fg-muted">{listing.description}</p>
                ) : null}

                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-4 text-sm sm:grid-cols-4">
                  {listing.year ? (
                    <div>
                      <dt className="text-fg-subtle">{t("year")}</dt>
                      <dd className="tabular font-medium text-fg">{listing.year}</dd>
                    </div>
                  ) : null}
                  {listing.operatingHours ? (
                    <div>
                      <dt className="text-fg-subtle">{t("operatingHours")}</dt>
                      <dd className="tabular font-medium text-fg">
                        {formatNumber(listing.operatingHours, locale)} h
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-fg-subtle">{t("warranty")}</dt>
                    <dd className="font-medium text-fg">
                      {listing.warrantyMonths > 0 ? t("warrantyMonths", { months: listing.warrantyMonths }) : t("noWarranty")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">{t("reference")}</dt>
                    <dd className="tabular font-medium text-fg">{listing.reference}</dd>
                  </div>
                </dl>
              </CardBody>
            </Card>
          </section>

          {attachments.length ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">{t("documents")}</h2>
              <ul className="space-y-2">
                {attachments.map((attachment) => (
                  <li
                    key={attachment.id}
                    className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-bg-elevated px-3 py-2 text-sm"
                  >
                    <FileText className="size-4 text-fg-subtle" aria-hidden="true" />
                    <span className="text-fg">{attachment.filename}</span>
                    <Badge tone="outline" className="ml-auto">{attachment.kind}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* The catalogue record, not the advert: specifications belong to the model. */}
          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-lg font-semibold">{t("specifications")}</h2>
              <Link href={`/${locale}/modell/${model.slug}`} className="text-sm text-primary hover:underline">
                {t("aboutModel")} →
              </Link>
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>{tm("specifications")}</Th>
                  <Th>{tc("results") === "results" ? "Value" : "Wert"}</Th>
                </tr>
              </thead>
              <tbody>
                {specFields.map((field) => {
                  const value = model.specs?.[field.key];
                  if (value === undefined || value === null || value === "") return null;
                  return (
                    <tr key={field.key}>
                      <Td className="w-1/2 text-fg-muted">{pick(field.label, locale)}</Td>
                      <Td className="tabular">
                        {typeof value === "number" ? formatNumber(value, locale) : String(value)}
                        {field.unit ? ` ${field.unit}` : ""}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <p className="text-xs text-fg-subtle">
              {model.manufacturerVerifiedAt ? tm("manufacturerVerified") : tm("communityData")} ·{" "}
              <span className="tabular">{model.recordNumber}</span>
            </p>
          </section>

          {flags.commentsOnListings ? (
            <CommentSection
              locale={locale}
              targetType="listing"
              targetId={listing.id}
              sellerId={listing.sellerProfileId}
              path={`/${locale}/geraete/${listing.slug}`}
            />
          ) : null}

          {related.length ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">{t("relatedListings")}</h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {related.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/${locale}/geraete/${item.slug}`}
                      className="block rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-3 transition-shadow hover:shadow-[var(--shadow-md)]"
                    >
                      <p className="truncate text-sm font-medium text-fg">{item.title}</p>
                      <p className="mt-1 text-xs text-fg-muted">
                        {item.year} · {item.locationCity}
                      </p>
                      <p className="tabular mt-1.5 font-semibold text-fg">
                        {formatMoney(item.priceCents, item.currency, locale)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {/* Price and trust column, after mockup S4. */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {listing.verifiedAt ? <VerifiedBadge /> : null}
              <ConditionBadge condition={listing.condition} inspected={!!listing.inspectedAt} />
              <WarrantyBadge months={listing.warrantyMonths} />
            </div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight">{listing.title}</h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
              {listing.year ? <span className="tabular">{listing.year}</span> : null}
              {listing.operatingHours ? (
                <span className="tabular inline-flex items-center gap-1">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {formatNumber(listing.operatingHours, locale)} h
                </span>
              ) : null}
              <LocationLine city={listing.locationCity} country={listing.locationCountry} />
            </p>
          </div>

          <Card>
            <CardBody className="space-y-4">
              <div>
                <p className="tabular text-3xl font-bold text-fg">
                  {formatMoney(listing.priceCents, listing.currency, locale)}
                </p>
                <p className="mt-0.5 text-xs text-fg-subtle">
                  {t("plusShipping")} · {t("vatNote")}
                </p>
              </div>

              {isBuyable ? (
                <div className="space-y-2">
                  {flags.buyNowEnabled && listing.negotiable !== "offer" ? (
                    <ButtonLink
                      href={`/${locale}/kaufen/${listing.slug}`}
                      size="lg"
                      className="w-full"
                    >
                      {t("buyNow")}
                    </ButtonLink>
                  ) : null}
                  {flags.offersEnabled && listing.negotiable !== "fixed" ? (
                    <ButtonLink
                      href={`/${locale}/geraete/${listing.slug}/angebot`}
                      variant="secondary"
                      size="lg"
                      className="w-full"
                    >
                      {t("makeOffer")}
                    </ButtonLink>
                  ) : null}
                  <form action={startConversationAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="listingId" value={listing.id} />
                    <button type="submit" className={buttonClass("secondary", "md", "w-full")}>
                      <MessageSquare className="size-4" aria-hidden="true" />
                      {t("contactSeller")}
                    </button>
                  </form>
                </div>
              ) : (
                <Badge tone={listing.status === "sold" ? "neutral" : "warning"} className="w-full justify-center py-1.5">
                  {listing.status === "sold"
                    ? t("soldNote")
                    : listing.status === "reserved"
                      ? t("reservedNote")
                      : t("withdrawnNote")}
                </Badge>
              )}

              <div className="flex gap-2 border-t border-border pt-3">
                <WatchButton
                  listingId={listing.id}
                  locale={locale}
                  labels={{ watch: t("watch"), unwatch: t("unwatch") }}
                />
                <Button variant="ghost" size="sm" className="flex-1">
                  <Share2 className="size-3.5" aria-hidden="true" />
                  {t("share")}
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t("seller")} />
            <CardBody className="space-y-3 text-sm">
              <div>
                <Link
                  href={
                    organisation
                      ? `/${locale}/anbieter/${organisation.slug}`
                      : `/${locale}/profil/${seller.id}`
                  }
                  className="font-medium text-fg hover:underline"
                >
                  {organisation?.name ?? seller.displayName}
                </Link>
                {organisation?.verifiedAt || seller.verifiedAt ? (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-success">
                    <ShieldCheck className="size-3.5" aria-hidden="true" />
                    {t("verified")}
                  </p>
                ) : null}
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-fg-subtle">{t("sellerSince")}</dt>
                  <dd className="tabular text-fg">{formatDate(seller.createdAt, locale)}</dd>
                </div>
                <div>
                  <dt className="text-fg-subtle">{t("respondsIn")}</dt>
                  <dd className="text-fg">2 h</dd>
                </div>
                <div>
                  <dt className="text-fg-subtle">{tc("results")}</dt>
                  <dd className="tabular text-fg">{sellerStats.activeListings}</dd>
                </div>
                <div>
                  <dt className="text-fg-subtle">{t("location")}</dt>
                  <dd className="text-fg">
                    <MapPin className="mr-1 inline size-3" aria-hidden="true" />
                    {organisation?.city ?? seller.city}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          {flags.showPriceRangeOnModel && priceRange && priceRange.count > 1 ? (
            <Card>
              <CardHeader title={tm("priceRange")} />
              <CardBody className="space-y-2 text-sm">
                <p className="tabular text-lg font-semibold text-fg">
                  {formatMoney(priceRange.minCents, listing.currency, locale)} –{" "}
                  {formatMoney(priceRange.maxCents, listing.currency, locale)}
                </p>
                <p className="text-xs text-fg-subtle">{tm("priceRangeNote", { count: priceRange.count })}</p>
                <Link href={`/${locale}/modell/${model.slug}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <Gauge className="size-3.5" aria-hidden="true" />
                  {t("moreFromModel")}
                </Link>
              </CardBody>
            </Card>
          ) : null}

          <p className="text-xs text-fg-subtle">
            {t("publishedAt")}: {formatDate(listing.publishedAt, locale)} ·{" "}
            <span className="tabular">{formatNumber(listing.viewCount, locale)}</span> {t("viewCount")}
          </p>
        </aside>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { eq } from "drizzle-orm";
import { BadgeCheck, MapPin } from "lucide-react";
import { db } from "@/db/client";
import { organisationMembers, organisations, profiles } from "@/db/schema/identity";
import { ratingList, ratingSummary } from "@/db/queries/ratings";
import { searchProvider } from "@/integrations/search";
import { formatDate, formatNumber } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { Card, CardBody, CardHeader, Section } from "@/ui/card";
import { EmptyState } from "@/ui/empty-state";
import { JsonLd } from "@/ui/json-ld";
import { ListingCardItem } from "@/ui/listing-card";
import { RatingList, RatingSummaryLine } from "@/ui/ratings";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function getOrganisation(slug: string) {
  const [row] = await db.select().from(organisations).where(eq(organisations.slug, slug)).limit(1);
  return row ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const organisation = await getOrganisation(slug);
  if (!organisation) return {};
  return {
    title: organisation.name,
    description: organisation.about ?? undefined,
    alternates: { canonical: `${siteUrl}/${locale}/anbieter/${slug}` },
  };
}

export default async function OrganisationProfilePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const organisation = await getOrganisation(slug);
  if (!organisation || organisation.suspendedAt) notFound();

  const t = await getTranslations({ locale, namespace: "listing" });
  const tc = await getTranslations({ locale, namespace: "category" });
  const tr = await getTranslations({ locale, namespace: "ratings" });

  const [listings, memberCount, rating, received] = await Promise.all([
    searchProvider().search({ organisationId: organisation.id, perPage: 12, sort: "newest" }),
    db
      .select({ displayName: profiles.displayName })
      .from(organisationMembers)
      .innerJoin(profiles, eq(profiles.id, organisationMembers.profileId))
      .where(eq(organisationMembers.organisationId, organisation.id)),
    ratingSummary({ organisationId: organisation.id }),
    ratingList({ organisationId: organisation.id }, 20),
  ]);

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: organisation.name,
          description: organisation.about ?? undefined,
          url: `${siteUrl}/${locale}/anbieter/${slug}`,
          address: {
            "@type": "PostalAddress",
            addressLocality: organisation.city ?? undefined,
            addressCountry: organisation.country,
          },
        }}
      />
      <Breadcrumbs
        items={[
          { name: "refreshLab", href: `/${locale}` },
          { name: organisation.name, href: `/${locale}/anbieter/${slug}` },
        ]}
      />

      {/* Reputation passport, after mockup S18. */}
      <header className="border-b border-border pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-fg-subtle">
              {organisation.verifiedAt ? t("verified") : organisation.type}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{organisation.name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden="true" />
                {organisation.city}, {organisation.country}
              </span>
              <span>
                {t("sellerSince")} {formatDate(organisation.createdAt, locale)}
              </span>
              <span className="tabular">
                {formatNumber(listings.total, locale)} {tc("offers")}
              </span>
              <span>
                {memberCount.length} {locale === "de" ? "Mitglieder" : "members"}
              </span>
            </p>
            <p className="mt-2">
              <RatingSummaryLine
                {...rating}
                labels={{
                  stars: tr("starsLabel", { score: rating.average?.toFixed(1) ?? "0" }),
                  count: tr("count", { count: rating.count }),
                  none: tr("none"),
                }}
              />
            </p>
            {organisation.about ? (
              <p className="mt-3 max-w-2xl leading-relaxed text-fg-muted">{organisation.about}</p>
            ) : null}
          </div>

          {organisation.verifications.length ? (
            <Card className="w-full max-w-xs">
              <CardHeader title={locale === "de" ? "Verifizierungen" : "Verifications"} />
              <CardBody>
                <ul className="space-y-1.5 text-sm">
                  {organisation.verifications.map((item) => (
                    <li key={item} className="flex items-start gap-1.5 text-fg-muted">
                      <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </header>

      <div className="py-8">
        <Section title={tc("offers")}>
          {listings.items.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {listings.items.map((listing) => (
                <li key={listing.id}>
                  <ListingCardItem listing={listing} locale={locale} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={locale === "de" ? "Keine aktiven Angebote." : "No active listings."} />
          )}
        </Section>
      </div>

      <div id="bewertungen" className="scroll-mt-32 border-t border-border py-8">
        <Section title={tr("title")}>
          {received.length ? (
            <RatingList
              locale={locale}
              items={received.map((item) => ({
                ...item,
                starsLabel: tr("starsLabel", { score: String(item.score) }),
              }))}
            />
          ) : (
            <EmptyState title={tr("none")} />
          )}
        </Section>
      </div>
    </main>
  );
}

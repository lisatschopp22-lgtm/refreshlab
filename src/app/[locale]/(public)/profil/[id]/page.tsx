import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { eq } from "drizzle-orm";
import { BadgeCheck, MapPin } from "lucide-react";
import { db } from "@/db/client";
import { profiles } from "@/db/schema/identity";
import { ratingList, ratingSummary } from "@/db/queries/ratings";
import { searchProvider } from "@/integrations/search";
import { formatDate, formatNumber } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { EmptyState } from "@/ui/empty-state";
import { ListingCardItem } from "@/ui/listing-card";
import { RatingList, RatingSummaryLine } from "@/ui/ratings";
import { Section } from "@/ui/card";
import { StorageImage } from "@/ui/storage-image";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  // A personal profile carries a real person's name, so it stays out of search.
  return { title: profile?.displayName ?? "", robots: { index: false, follow: true } };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  if (!profile || profile.suspendedAt) notFound();

  const t = await getTranslations({ locale, namespace: "listing" });
  const tc = await getTranslations({ locale, namespace: "category" });
  const tr = await getTranslations({ locale, namespace: "ratings" });
  const [listings, asSeller, asBuyer, received] = await Promise.all([
    searchProvider().search({ sellerId: profile.id, perPage: 12, sort: "newest" }),
    ratingSummary({ profileId: profile.id, as: "seller" }),
    ratingSummary({ profileId: profile.id, as: "buyer" }),
    ratingList({ profileId: profile.id }, 20),
  ]);
  const summaryLabels = (summary: { average: number | null; count: number }) => ({
    stars: tr("starsLabel", { score: summary.average?.toFixed(1) ?? "0" }),
    count: tr("count", { count: summary.count }),
    none: tr("none"),
  });

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6">
      <Breadcrumbs
        items={[
          { name: "refreshLab", href: `/${locale}` },
          { name: profile.displayName, href: `/${locale}/profil/${id}` },
        ]}
      />

      <header className="flex flex-wrap items-start gap-4 border-b border-border pb-6">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-full border border-border bg-bg-sunken">
          <StorageImage path={profile.avatarPath} alt="" sizes="64px" />
        </div>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            {profile.displayName}
            {profile.verifiedAt ? (
              <BadgeCheck className="size-5 text-success" aria-label={t("verified")} />
            ) : null}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
            {profile.city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden="true" />
                {profile.city}, {profile.country}
              </span>
            ) : null}
            <span>
              {t("sellerSince")} {formatDate(profile.createdAt, locale)}
            </span>
            <span className="tabular">
              {formatNumber(listings.total, locale)} {tc("offers")}
            </span>
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
            {asSeller.count || !asBuyer.count ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-xs text-fg-subtle">{tr("asSeller")}</span>
                <RatingSummaryLine {...asSeller} labels={summaryLabels(asSeller)} />
              </span>
            ) : null}
            {asBuyer.count ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-xs text-fg-subtle">{tr("asBuyer")}</span>
                <RatingSummaryLine {...asBuyer} labels={summaryLabels(asBuyer)} />
              </span>
            ) : null}
          </p>
          {profile.bio ? <p className="mt-2 max-w-2xl text-fg-muted">{profile.bio}</p> : null}
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
                context: item.side === "buyer" ? tr("raterBuyer") : tr("raterSeller"),
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

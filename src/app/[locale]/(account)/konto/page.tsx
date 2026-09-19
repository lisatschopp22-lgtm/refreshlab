import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { dashboardSummary } from "@/db/queries/account";
import { formatNumber } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { ButtonLink } from "@/ui/button";
import { Card, CardBody, Section } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { EmptyState } from "@/ui/empty-state";

export const metadata = { robots: { index: false } };

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "account" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const ts = await getTranslations({ locale, namespace: "search" });

  const summary = await dashboardSummary(user.id, user.organisations.map((o) => o.id));

  const tiles = [
    { label: t("activeListings"), value: summary.listings.active, href: `/${locale}/konto/inserate` },
    { label: t("unreadMessages"), value: summary.unreadMessages, href: `/${locale}/nachrichten` },
    { label: t("openOffers"), value: summary.offers.incoming + summary.offers.outgoing, href: `/${locale}/konto/angebote` },
    { label: t("watchlistItems"), value: summary.watchlist, href: `/${locale}/konto/merkliste` },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("welcome", { name: user.displayName })}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {user.email}
            {user.organisations.length ? ` · ${user.organisations.map((o) => o.name).join(", ")}` : ""}
          </p>
        </div>
        <ButtonLink href={`/${locale}/verkaufen`}>{tn("sell")}</ButtonLink>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <li key={tile.label}>
            <Link href={tile.href}>
              <Card className="transition-colors hover:border-[var(--primary)]">
                <CardBody>
                  <p className="tabular text-3xl font-bold text-fg">{formatNumber(tile.value, locale)}</p>
                  <p className="mt-1 text-sm text-fg-muted">{tile.label}</p>
                </CardBody>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      {summary.listings.draft > 0 || summary.listings.pending > 0 ? (
        <Card>
          <CardBody className="flex flex-wrap items-center gap-3 text-sm">
            {summary.listings.draft > 0 ? (
              <Badge tone="outline">
                {summary.listings.draft} {locale === "de" ? "Entwürfe" : "drafts"}
              </Badge>
            ) : null}
            {summary.listings.pending > 0 ? (
              <Badge tone="warning">
                {summary.listings.pending} {locale === "de" ? "in Prüfung" : "in review"}
              </Badge>
            ) : null}
            <Link href={`/${locale}/konto/inserate`} className="text-primary hover:underline">
              {tn("myListings")} →
            </Link>
          </CardBody>
        </Card>
      ) : null}

      <Section title={t("savedSearches")}>
        {summary.savedSearches.length ? (
          <ul className="space-y-2">
            {summary.savedSearches.map((search) => {
              const params = new URLSearchParams();
              if (search.query.q) params.set("q", search.query.q);
              if (search.query.category) params.set("kategorie", search.query.category);
              if (search.query.condition?.length) params.set("zustand", search.query.condition.join(","));
              if (search.query.country?.length) params.set("land", search.query.country.join(","));
              if (search.query.maxPrice) params.set("max", String(Math.round(search.query.maxPrice / 100)));
              return (
                <li key={search.id}>
                  <Link
                    href={`/${locale}/suche?${params.toString()}`}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-bg-elevated px-3 py-2.5 text-sm transition-colors hover:border-[var(--primary)]"
                  >
                    <span className="font-medium text-fg">{search.name}</span>
                    <span className="text-xs text-fg-subtle">{ts("saveSearch")} →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title={ts("saveSearch")} description={ts("emptyText")} />
        )}
      </Section>
    </div>
  );
}

import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Database, Gauge, Search, ShieldCheck } from "lucide-react";
import { catalogueCounts, listCategories } from "@/db/queries/catalogue";
import { searchProvider } from "@/integrations/search";
import { feeRule } from "@/domain/settings";
import { formatNumber, formatPercent, pick } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { ButtonLink } from "@/ui/button";
import { Card, CardBody, Section } from "@/ui/card";
import { ListingCardItem } from "@/ui/listing-card";
import { QualifiedFacts } from "@/ui/qualified-facts";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "home" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const th = await getTranslations({ locale, namespace: "humour" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const tq = await getTranslations({ locale, namespace: "qualified" });

  const search = searchProvider();
  const [categories, counts, latest, featured, rule] = await Promise.all([
    listCategories(),
    catalogueCounts(),
    search.search({ sort: "newest", perPage: 8 }),
    search.search({ verifiedOnly: true, perPage: 4 }),
    feeRule(),
  ]);

  return (
    <main>
      {/* Hero, after mockup S1: search-first, one clear promise, no carousel. */}
      <section className="border-b border-border bg-bg-subtle">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:py-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] bg-primary-subtle px-3 py-1 text-sm font-medium text-primary-subtle-fg">
              ♻ {th("heroKicker")}
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-fg sm:text-5xl lg:text-6xl">
              {t("title")}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-fg-muted">{t("subtitle")}</p>

            {/* The three ways in: the open marketplace, qualified equipment, parts donors. */}
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={`/${locale}/suche`} size="lg">
                {t("buyCta")}
              </ButtonLink>
              <ButtonLink href={`/${locale}/qualifizierte-geraete`} size="lg" variant="secondary">
                {tn("qualified")}
              </ButtonLink>
              <ButtonLink href={`/${locale}/ersatzteillager`} size="lg" variant="secondary">
                {tn("parts")}
              </ButtonLink>
            </div>

            <form action={`/${locale}/suche`} className="mt-4 flex max-w-xl gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
                <input
                  type="search"
                  name="q"
                  aria-label={tc("search")}
                  placeholder={tc("searchPlaceholder")}
                  className="h-12 w-full rounded-[var(--radius-lg)] border border-border-strong bg-bg-elevated pl-11 pr-4 text-base text-fg shadow-[var(--shadow-sm)] placeholder:text-fg-subtle focus:outline-2 focus:outline-[var(--ring)]"
                />
              </div>
              <button
                type="submit"
                className="h-12 rounded-[var(--radius-lg)] bg-primary px-6 font-medium text-primary-fg shadow-[var(--shadow-sm)] hover:bg-primary-hover"
              >
                {t("searchCta")}
              </button>
            </form>

            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div className="flex items-baseline gap-2">
                <dt className="tabular text-base font-semibold text-fg">38–72%</dt>
                <dd className="text-fg-muted">{t("statSaving")}</dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="tabular text-base font-semibold text-fg">{formatNumber(counts.listings, locale)}</dt>
                <dd className="text-fg-muted">{t("statListings")}</dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="tabular text-base font-semibold text-fg">{formatNumber(counts.models, locale)}</dt>
                <dd className="text-fg-muted">{t("statModels")}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] space-y-16 px-4 py-14">
        <Section
          title={tq("homeTitle")}
          action={
            <Link
              href={`/${locale}/qualifizierte-geraete`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {tq("homeCta")} →
            </Link>
          }
        >
          <div className="max-w-3xl space-y-3 leading-relaxed text-fg-muted">
            <p>{tq("open")}</p>
            <p>{tq("meaning")}</p>
          </div>
          <QualifiedFacts />
        </Section>

        <Section title={t("categoriesTitle")} description={t("categoriesSubtitle")}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* The catalogue lists every category; the home page only those with something to buy. */}
            {categories.filter((category) => category.listingCount > 0).map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/${locale}/kategorie/${category.slug}`}
                  className="group flex h-full flex-col justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-4 transition-colors hover:border-[var(--primary)]"
                >
                  <span className="font-medium text-fg">{pick(category.name, locale)}</span>
                  <span className="tabular text-sm text-fg-muted">
                    {formatNumber(category.listingCount, locale)} {tc("results")}
                    <ArrowRight className="ml-1 inline size-3.5 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        {featured.items.length > 0 ? (
          <Section title={t("featuredTitle")}>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featured.items.map((listing) => (
                <li key={listing.id}>
                  <ListingCardItem listing={listing} locale={locale} />
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section
          title={t("latestTitle")}
          description={t("latestSubtitle")}
          action={
            <Link
              href={`/${locale}/suche`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("browseAll")} →
            </Link>
          }
        >
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {latest.items.map((listing) => (
              <li key={listing.id}>
                <ListingCardItem listing={listing} locale={locale} />
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t("trustTitle")}>
          <ul className="grid gap-4 md:grid-cols-3">
            {[
              { icon: Database, title: t("trustDatabase"), text: t("trustDatabaseText") },
              { icon: ShieldCheck, title: t("trustCondition"), text: t("trustConditionText") },
              {
                icon: Gauge,
                title: t("trustFee"),
                text: t("trustFeeText", {
                  total: formatPercent(rule.sellerPercent + rule.buyerPercent, locale),
                  seller: formatPercent(rule.sellerPercent, locale),
                  buyer: formatPercent(rule.buyerPercent, locale),
                }),
              },
            ].map((item) => (
              <li key={item.title}>
                <Card className="h-full">
                  <CardBody className="space-y-2">
                    <item.icon className="size-5 text-primary" aria-hidden="true" />
                    <h3 className="font-semibold text-fg">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-fg-muted">{item.text}</p>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        </Section>

        <Card className="bg-primary-subtle">
          <CardBody className="flex flex-wrap items-center justify-between gap-4 py-8">
            <div>
              <h2 className="text-xl font-semibold text-primary-subtle-fg">{t("sellCtaTitle")}</h2>
              <p className="mt-1 text-sm text-primary-subtle-fg/80">{t("sellCtaText")}</p>
            </div>
            <ButtonLink href={`/${locale}/verkaufen`} size="lg">
              {t("searchCta") === "Search" ? "Sell equipment" : "Gerät verkaufen"}
            </ButtonLink>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}

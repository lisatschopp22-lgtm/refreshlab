import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { catalogueCounts, listCategories, listManufacturers } from "@/db/queries/catalogue";
import { formatNumber, pick } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { Card, CardBody, Section } from "@/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  const ts = await getTranslations({ locale, namespace: "seo" });
  return { title: t("catalogue"), description: ts("defaultDescription") };
}

export default async function CataloguePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "category" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const tf = await getTranslations({ locale, namespace: "footer" });

  const [categories, manufacturers, counts] = await Promise.all([
    listCategories(),
    listManufacturers(),
    catalogueCounts(),
  ]);

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6">
      <Breadcrumbs
        items={[
          { name: "refreshLab", href: `/${locale}` },
          { name: tn("catalogue"), href: `/${locale}/katalog` },
        ]}
      />
      <header className="max-w-3xl space-y-2 border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight">{tn("catalogue")}</h1>
        <p className="tabular text-sm text-fg-muted">
          {formatNumber(counts.models, locale)} {t("models")} ·{" "}
          {formatNumber(counts.manufacturers, locale)} {tf("manufacturers")} ·{" "}
          {formatNumber(counts.listings, locale)} {t("offers")}
        </p>
      </header>

      <div className="space-y-12 py-8">
        <Section title={t("title")}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link href={`/${locale}/kategorie/${category.slug}`}>
                  <Card className="h-full transition-colors hover:border-[var(--primary)]">
                    <CardBody className="space-y-1.5">
                      <p className="font-medium text-fg">{pick(category.name, locale)}</p>
                      <p className="line-clamp-2 text-sm text-fg-muted">{pick(category.intro, locale)}</p>
                      <p className="tabular text-xs text-fg-subtle">
                        {category.listingCount} {t("offers")} · {category.modelCount} {t("models")}
                      </p>
                    </CardBody>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={tf("manufacturers")}>
          <ul className="flex flex-wrap gap-2">
            {manufacturers.map((manufacturer) => (
              <li key={manufacturer.slug}>
                <Link
                  href={`/${locale}/hersteller/${manufacturer.slug}`}
                  className="inline-flex items-center gap-2 rounded-[var(--radius-full)] border border-border bg-bg-elevated px-3 py-1.5 text-sm text-fg transition-colors hover:border-[var(--primary)]"
                >
                  {manufacturer.name}
                  <span className="tabular text-xs text-fg-subtle">{manufacturer.modelCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </main>
  );
}

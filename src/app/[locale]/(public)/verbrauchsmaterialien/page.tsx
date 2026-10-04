import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { ButtonLink } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "consumables" });
  return {
    title: t("title"),
    description: t("description"),
    // Nothing to index until consumables can actually be listed.
    robots: { index: false, follow: true },
  };
}

export default async function ConsumablesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "consumables" });

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6">
      <Breadcrumbs
        items={[
          { name: "refreshLab", href: `/${locale}` },
          { name: t("title"), href: `/${locale}/verbrauchsmaterialien` },
        ]}
      />

      <header className="max-w-3xl space-y-3 border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="leading-relaxed text-fg-muted">{t("lead")}</p>
      </header>

      {/* Listings hang on equipment models, so there is nothing to show here yet. */}
      <div className="py-8">
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyText")}
          action={
            <ButtonLink href={`/${locale}/suche`} variant="secondary" size="sm">
              {t("emptyCta")}
            </ButtonLink>
          }
        />
      </div>
    </main>
  );
}

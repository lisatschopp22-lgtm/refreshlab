import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Ban, CircleCheck } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { ButtonLink } from "@/ui/button";
import { Card, CardBody } from "@/ui/card";
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
        <p className="leading-relaxed text-fg-muted">{t("text")}</p>
      </header>

      <div className="space-y-8 py-8">
        <ul className="grid gap-4 md:grid-cols-2">
          <li>
            <Card className="h-full">
              <CardBody className="space-y-2">
                <CircleCheck className="size-5 text-success" aria-hidden="true" />
                <h2 className="font-semibold text-fg">{t("welcomeTitle")}</h2>
                <p className="text-sm leading-relaxed text-fg-muted">{t("welcomeText")}</p>
              </CardBody>
            </Card>
          </li>
          <li>
            <Card className="h-full">
              <CardBody className="space-y-2">
                <Ban className="size-5 text-danger" aria-hidden="true" />
                <h2 className="font-semibold text-fg">{t("excludedTitle")}</h2>
                <p className="text-sm leading-relaxed text-fg-muted">{t("excludedText")}</p>
              </CardBody>
            </Card>
          </li>
        </ul>

        {/* Listings hang on equipment models, so there is nothing to show here yet. */}
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

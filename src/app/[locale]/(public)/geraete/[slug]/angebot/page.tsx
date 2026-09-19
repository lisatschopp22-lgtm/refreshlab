import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { currentUser } from "@/auth/session";
import { getListingBySlug } from "@/db/queries/listings";
import { canOfferOn } from "@/domain/permissions";
import { flagsFromEnv } from "@/domain/flags";
import { formatMoney } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { Card, CardBody, CardHeader } from "@/ui/card";
import { OfferForm } from "@/ui/transaction-forms";

export const metadata = { robots: { index: false } };

export default async function MakeOfferPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const user = await currentUser();
  if (!user) redirect(`/${locale}/anmelden?next=/${locale}/geraete/${slug}/angebot`);

  const data = await getListingBySlug(slug);
  if (!data || data.listing.status !== "active") notFound();
  if (!flagsFromEnv().offersEnabled || data.listing.negotiable === "fixed") notFound();

  const t = await getTranslations({ locale, namespace: "offers" });
  const own = !canOfferOn(user, data.listing);

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Breadcrumbs
        items={[
          { name: "refreshLab", href: `/${locale}` },
          { name: data.listing.title, href: `/${locale}/geraete/${slug}` },
          { name: t("make"), href: `/${locale}/geraete/${slug}/angebot` },
        ]}
      />
      <Card>
        <CardHeader title={t("make")} description={data.listing.title} />
        <CardBody>
          {own ? (
            <p className="text-sm text-fg-muted">{t("ownListing")}</p>
          ) : (
            <OfferForm
              locale={locale}
              listingId={data.listing.id}
              currency={data.listing.currency}
              askingPrice={formatMoney(data.listing.priceCents, data.listing.currency, locale)}
              labels={{
                amount: t("amount"),
                messageOptional: t("messageOptional"),
                submit: t("submit"),
                listPrice: t("listPrice"),
                below_minimum: t("belowMinimum"),
                own_listing: t("ownListing"),
                not_available: t("noOffers"),
                fixed_price: t("noOffers"),
                invalid_amount: t("amount"),
                generic: t("noOffers"),
              }}
            />
          )}
        </CardBody>
      </Card>
    </main>
  );
}

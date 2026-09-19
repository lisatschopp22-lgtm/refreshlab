import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { getEditableListing } from "@/domain/listings";
import { modelPriceRange } from "@/db/queries/catalogue";
import { formatMoney } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Card, CardBody, CardHeader } from "@/ui/card";
import { PriceForm } from "@/ui/sell-forms";
import { WizardSteps } from "@/ui/wizard-steps";

export default async function PriceStep({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  const listing = await getEditableListing(user, id);
  const range = await modelPriceRange(listing.modelId);

  const t = await getTranslations({ locale, namespace: "sell" });
  const ts = await getTranslations({ locale, namespace: "saleMode" });

  const suggestion =
    range && range.count > 1
      ? t("suggestedPrice", {
          min: formatMoney(range.minCents, "CHF", locale),
          max: formatMoney(range.maxCents, "CHF", locale),
        })
      : undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <WizardSteps steps={[t("step1"), t("step2"), t("step3"), t("step4")]} current={3} />
      </div>

      <Card>
        <CardHeader title={t("priceTitle")} />
        <CardBody>
          <PriceForm
            locale={locale}
            listingId={id}
            suggestion={suggestion}
            defaults={{
              price: listing.priceCents > 0 ? String(listing.priceCents / 100) : "",
              currency: listing.currency,
              minPrice: listing.minPriceCents ? String(listing.minPriceCents / 100) : "",
              negotiable: listing.negotiable,
              locationCity: listing.locationCity,
              locationCountry: listing.locationCountry,
              warrantyMonths: listing.warrantyMonths,
            }}
            saleModes={[
              { value: "both", label: ts("both") },
              { value: "fixed", label: ts("fixed") },
              { value: "offer", label: ts("offer") },
            ]}
            countries={["CH", "DE", "AT", "FR", "IT", "ES", "NL", "BE"]}
            labels={{
              price: t("price"),
              currency: t("currency"),
              minPrice: t("minPrice"),
              minPriceHint: t("minPriceHint"),
              saleMode: t("saleMode"),
              locationCity: t("locationCity"),
              locationCountry: t("locationCountry"),
              warranty: t("warranty"),
              continueToReview: t("continueToReview"),
              saveDraft: t("saveDraft"),
              draftSaved: t("draftSaved"),
              priceInvalid: locale === "de" ? "Bitte einen Betrag angeben." : "Please enter an amount.",
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}

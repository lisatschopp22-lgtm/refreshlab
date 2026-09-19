import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { listCategories, listManufacturers } from "@/db/queries/catalogue";
import { pick } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Card, CardBody } from "@/ui/card";
import { ProposeModelForm } from "@/ui/propose-model-form";
import { WizardSteps } from "@/ui/wizard-steps";

export const metadata = { robots: { index: false } };

export default async function ProposeModelPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "sell" });
  const [categories, manufacturers] = await Promise.all([listCategories(), listManufacturers()]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("proposeModel")}</h1>
        <WizardSteps steps={[t("step1"), t("step2"), t("step3"), t("step4")]} current={1} />
      </div>
      <Card>
        <CardBody>
          <ProposeModelForm
            locale={locale}
            categories={categories.map((c) => ({ id: c.id, name: pick(c.name, locale) }))}
            manufacturers={manufacturers.map((m) => ({ id: m.id, name: m.name }))}
            organisations={user.organisations.filter((o) => o.canPublish)}
            labels={{
              manufacturer: t("manufacturer"),
              category: locale === "de" ? "Kategorie" : "Category",
              name: locale === "de" ? "Modellbezeichnung" : "Model name",
              note: t("proposeNote"),
              submit: t("continueToCondition"),
              sellAs: locale === "de" ? "Verkaufen als" : "Sell as",
              asPrivate: locale === "de" ? "Privatperson" : "Private individual",
              error: locale === "de" ? "Bitte alle Felder ausfüllen." : "Please complete every field.",
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}

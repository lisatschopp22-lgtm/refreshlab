import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/auth/session";
import type { Locale } from "@/i18n/routing";
import { Card, CardBody } from "@/ui/card";
import { ModelPicker } from "@/ui/model-picker";
import { WizardSteps } from "@/ui/wizard-steps";

export const metadata = { robots: { index: false } };

export default async function SellStartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "sell" });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <WizardSteps steps={[t("step1"), t("step2"), t("step3"), t("step4")]} current={1} />
      </div>

      <Card>
        <CardBody className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">{t("identifyTitle")}</h2>
            <p className="mt-1 text-sm text-fg-muted">{t("identifyText")}</p>
          </div>
          <ModelPicker
            locale={locale}
            organisations={user.organisations.filter((o) => o.canPublish)}
            proposeHref={`/${locale}/verkaufen/neues-modell`}
            labels={{
              modelSearch: t("modelSearch"),
              identifyText: t("identifyText"),
              select: t("select"),
              modelNotFound: t("modelNotFound"),
              proposeModel: t("proposeModel"),
              newDeviceTitle: t("newDeviceTitle"),
              newDeviceText: t("newDeviceText"),
              newDeviceButton: t("proposeModel"),
              continueToCondition: t("continueToCondition"),
              sellAs: locale === "de" ? "Verkaufen als" : "Sell as",
              asPrivate: locale === "de" ? "Privatperson" : "Private individual",
              selectFirst: locale === "de" ? "Bitte zuerst ein Modell wählen." : "Please choose a model first.",
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}

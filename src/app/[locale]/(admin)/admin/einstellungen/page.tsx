import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/auth/session";
import { feeRule } from "@/domain/settings";
import { defaultFlags } from "@/domain/flags";
import { flags as readFlags } from "@/domain/settings";
import { calculateFees } from "@/domain/fees";
import { formatMoney } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Card, CardBody, CardHeader } from "@/ui/card";
import { SettingsForm } from "@/ui/admin-forms";
import { Table, Td, Th } from "@/ui/table";

export default async function AdminSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireAdmin(locale);

  const t = await getTranslations({ locale, namespace: "admin" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const to = await getTranslations({ locale, namespace: "orders" });

  const [rule, flags] = await Promise.all([feeRule(), readFlags()]);
  const examples = [50_000, 500_000, 2_000_000, 10_000_000, 50_000_000];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold tracking-tight">{t("settings")}</h1>

      <Card>
        <CardBody>
          <SettingsForm
            locale={locale}
            fee={rule}
            flags={Object.fromEntries(
              Object.keys(defaultFlags).map((key) => [key, flags[key as keyof typeof flags]]),
            )}
            labels={{
              feeRule: t("feeRule"),
              feeHint: t("feeHint"),
              feeSellerPercent: t("feeSellerPercent"),
              feeBuyerPercent: t("feeBuyerPercent"),
              feeCap: t("feeCap"),
              feeMin: t("feeMin"),
              flags: t("flags"),
              flagsHint:
                locale === "de"
                  ? "Offene Fragen aus den Anforderungen. Umgebungsvariablen haben Vorrang."
                  : "Open questions from the requirements. Environment variables take precedence.",
              save: tc("save"),
              saved: tc("save"),
              error: tc("error"),
            }}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t("feeRule")}
          description={
            locale === "de"
              ? "So wirkt sich das aktuelle Modell auf typische Verkäufe aus."
              : "What the current rule means for typical sales."
          }
        />
        <CardBody className="p-0">
          <Table>
            <thead>
              <tr>
                <Th>{to("itemPrice")}</Th>
                <Th>{to("sellerFee")}</Th>
                <Th>{to("buyerFee")}</Th>
                <Th>{to("buyerPays")}</Th>
                <Th>{to("sellerReceives")}</Th>
                <Th>%</Th>
              </tr>
            </thead>
            <tbody>
              {examples.map((cents) => {
                const fees = calculateFees(cents, "CHF", rule);
                return (
                  <tr key={cents}>
                    <Td className="tabular">{formatMoney(cents, "CHF", locale)}</Td>
                    <Td className="tabular">{formatMoney(fees.seller.cents, "CHF", locale)}</Td>
                    <Td className="tabular">{formatMoney(fees.buyer.cents, "CHF", locale)}</Td>
                    <Td className="tabular">{formatMoney(cents + fees.buyer.cents, "CHF", locale)}</Td>
                    <Td className="tabular">{formatMoney(cents - fees.seller.cents, "CHF", locale)}</Td>
                    <Td className="tabular text-fg-subtle">{((fees.total.cents / cents) * 100).toFixed(2)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}

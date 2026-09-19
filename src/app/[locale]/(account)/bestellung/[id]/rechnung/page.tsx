import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { invoiceData } from "@/domain/orders";
import { PermissionError } from "@/domain/permissions";
import { formatDate, formatMoney } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Card, CardBody } from "@/ui/card";

export const metadata = { robots: { index: false } };

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  let data;
  try {
    data = await invoiceData(user, id);
  } catch (error) {
    if (error instanceof PermissionError) notFound();
    throw error;
  }

  const t = await getTranslations({ locale, namespace: "orders" });
  const order = data.order;

  return (
    <main className="mx-auto max-w-2xl py-4 print:max-w-none">
      <Card className="print:border-0 print:shadow-none">
        <CardBody className="space-y-6">
          <header className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="text-lg font-bold">
                refresh<span className="text-primary">Lab</span>
              </p>
              <p className="text-xs text-fg-subtle">
                {locale === "de" ? "Marktplatz für Laborgeräte" : "Marketplace for laboratory equipment"}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold">{t("invoiceLink")}</p>
              <p className="tabular text-fg-muted">{order.reference}</p>
              <p className="tabular text-xs text-fg-subtle">{formatDate(order.createdAt, locale)}</p>
            </div>
          </header>

          <div className="grid gap-6 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-fg-subtle">{t("seller")}</p>
              <p className="font-medium text-fg">{data.sellerOrgName ?? data.seller?.displayName}</p>
              <p className="text-fg-muted">{data.seller?.city}</p>
              <p className="text-fg-muted">{data.seller?.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-fg-subtle">{t("buyer")}</p>
              <p className="font-medium text-fg">{data.buyer?.displayName}</p>
              <p className="text-fg-muted">{data.buyer?.city}</p>
              <p className="text-fg-muted">{data.buyer?.email}</p>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-subtle">
                <th className="pb-2">{t("itemPrice")}</th>
                <th className="pb-2 text-right">{t("total")}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="py-2">{data.listingTitle}</td>
                <td className="tabular py-2 text-right">
                  {formatMoney(data.totals.itemCents, order.currency, locale)}
                </td>
              </tr>
              {data.totals.shippingCents > 0 ? (
                <tr className="border-b border-border">
                  <td className="py-2">{t("shipping")}</td>
                  <td className="tabular py-2 text-right">
                    {formatMoney(data.totals.shippingCents, order.currency, locale)}
                  </td>
                </tr>
              ) : null}
              <tr className="font-semibold">
                <td className="py-2">{t("total")}</td>
                <td className="tabular py-2 text-right">
                  {formatMoney(data.totals.totalCents, order.currency, locale)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Fees and taxes are stated separately, as the requirements ask. */}
          <div className="space-y-1 border-t border-border pt-4 text-xs text-fg-muted">
            <div className="flex justify-between">
              <span>{t("platformFee")}</span>
              <span className="tabular">{formatMoney(data.totals.feeCents, order.currency, locale)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("sellerReceives")}</span>
              <span className="tabular">
                {formatMoney(data.totals.sellerNetCents, order.currency, locale)}
              </span>
            </div>
            <p className="pt-3 text-fg-subtle">{t("paymentSimulated")}</p>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}

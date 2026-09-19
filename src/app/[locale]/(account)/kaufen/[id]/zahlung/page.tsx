import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { getOrder, orderTotals } from "@/domain/orders";
import { PermissionError } from "@/domain/permissions";
import { simulatePaymentAction } from "@/actions/transactions";
import { formatMoney } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { buttonClass } from "@/ui/button";
import { Card, CardBody, CardHeader } from "@/ui/card";

export const metadata = { robots: { index: false } };

/**
 * The fake provider's checkout page. It stands in for a hosted payment page,
 * with a deliberate "let it fail" button so the failure path can be tested
 * without a provider.
 */
export default async function FakeCheckoutPage({
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
    data = await getOrder(user, id);
  } catch (error) {
    if (error instanceof PermissionError) notFound();
    throw error;
  }

  const t = await getTranslations({ locale, namespace: "orders" });
  const totals = orderTotals(data.order);
  const isTransfer = data.order.paymentMethod === "bank_transfer";

  return (
    <div className="mx-auto max-w-md space-y-6">
      <Card>
        <CardHeader
          title={t("secureCheckout")}
          description={`${data.order.reference} · ${data.listingTitle}`}
        />
        <CardBody className="space-y-5">
          <p className="tabular text-3xl font-bold text-fg">
            {formatMoney(totals.totalCents, data.order.currency, locale)}
          </p>

          <p className="rounded-[var(--radius-md)] bg-warning-subtle px-3 py-2 text-sm text-warning">
            {t("paymentSimulated")}
          </p>

          {isTransfer ? (
            <div className="space-y-3 text-sm">
              <p className="text-fg-muted">{t("awaitingTransfer")}</p>
              <dl className="tabular space-y-1 rounded-[var(--radius-md)] bg-bg-sunken p-3 text-xs">
                <div className="flex justify-between">
                  <dt className="text-fg-subtle">IBAN</dt>
                  <dd>CH00 0000 0000 0000 0000 0</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-fg-subtle">{t("order")}</dt>
                  <dd>{data.order.reference}</dd>
                </div>
              </dl>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <form action={simulatePaymentAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="orderId" value={id} />
              <input type="hidden" name="outcome" value="success" />
              <button type="submit" className={buttonClass("primary", "lg", "w-full")}>
                {t("paySuccess")}
              </button>
            </form>
            <form action={simulatePaymentAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="orderId" value={id} />
              <input type="hidden" name="outcome" value="failure" />
              <button type="submit" className={buttonClass("secondary", "md", "w-full")}>
                {t("payFail")}
              </button>
            </form>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

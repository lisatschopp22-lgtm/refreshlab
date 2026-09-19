import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { requireUser } from "@/auth/session";
import { getOrder, milestoneIndex, orderTotals } from "@/domain/orders";
import { PermissionError } from "@/domain/permissions";
import { formatMoney } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Card, CardBody, CardHeader } from "@/ui/card";
import { MilestoneBar } from "@/ui/milestone-bar";
import { PaymentMethodForm } from "@/ui/transaction-forms";

export const metadata = { robots: { index: false } };

export default async function CheckoutPage({
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
  const tc = await getTranslations({ locale, namespace: "common" });
  const totals = orderTotals(data.order);

  if (data.order.status !== "pending_payment") {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <p className="text-fg-muted">{t("order")} {data.order.reference}</p>
        <Link href={`/${locale}/bestellung/${id}`} className="text-primary hover:underline">
          {t("timeline")} →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("secureCheckout")}</h1>
        <p className="tabular text-sm text-fg-muted">
          {t("order")} {data.order.reference} · {data.listingTitle}
        </p>
        <MilestoneBar
          steps={[t("stepOffer"), t("stepPayment"), t("stepShipping"), t("stepCheck"), t("stepPayout")]}
          current={milestoneIndex(data.order.status)}
        />
      </div>

      <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-info-subtle px-3 py-2.5 text-sm text-info">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t("payoutNote")}
      </p>

      <Card>
        <CardHeader title={t("paymentMethod")} />
        <CardBody>
          <PaymentMethodForm
            locale={locale}
            orderId={id}
            methods={[
              {
                value: "bank_transfer",
                label: t("bankTransfer"),
                hint: t("bankTransferHint"),
                recommended: data.order.amountCents > 1_000_000,
              },
              { value: "card", label: t("card") },
              { value: "invoice", label: t("invoice") },
            ]}
            labels={{
              paymentMethod: t("paymentMethod"),
              payNow: t("payNow"),
              simulated: t("paymentSimulated"),
              recommended: t("bankTransferHint"),
              not_your_order: tc("error"),
              generic: tc("error"),
            }}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("total")} />
        <CardBody>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">{t("itemPrice")}</dt>
              <dd className="tabular">{formatMoney(totals.itemCents, data.order.currency, locale)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">{t("shipping")}</dt>
              <dd className="tabular">
                {totals.shippingCents > 0
                  ? formatMoney(totals.shippingCents, data.order.currency, locale)
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-border pt-1.5 text-base font-semibold">
              <dt>{t("total")}</dt>
              <dd className="tabular">{formatMoney(totals.totalCents, data.order.currency, locale)}</dd>
            </div>
            <div className="flex justify-between gap-3 pt-2 text-xs text-fg-subtle">
              <dt>{t("platformFee")}</dt>
              <dd className="tabular">{formatMoney(totals.feeCents, data.order.currency, locale)}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>
    </div>
  );
}

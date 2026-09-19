import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FileText, ShieldCheck } from "lucide-react";
import { requireUser } from "@/auth/session";
import { actorFor, getOrder, milestoneIndex, nextStatuses, orderTotals } from "@/domain/orders";
import { PermissionError } from "@/domain/permissions";
import { confirmTransferAction } from "@/actions/transactions";
import { formatDateTime, formatMoney } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { buttonClass } from "@/ui/button";
import { Card, CardBody, CardHeader } from "@/ui/card";
import { MilestoneBar } from "@/ui/milestone-bar";
import { OrderActionButton } from "@/ui/transaction-forms";

export const metadata = { robots: { index: false } };

const statusTone = {
  pending_payment: "warning",
  paid: "info",
  shipped: "info",
  delivered: "primary",
  completed: "success",
  cancelled: "neutral",
  disputed: "danger",
  refunded: "neutral",
} as const;

export default async function OrderPage({
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
  const ts = await getTranslations({ locale, namespace: "orderStatus" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const th = await getTranslations({ locale, namespace: "humour" });

  const order = data.order;
  const totals = orderTotals(order);
  const actor = actorFor(user, order);
  const available = nextStatuses(order.status, actor);
  const isAdmin = user.role === "admin";

  const labels = {
    trackingReference: t("trackingReference"),
    disputeReason: t("disputeReason"),
    cancel: tc("cancel"),
    invalid_transition: tc("error"),
    generic: tc("error"),
  };

  const timeline = [
    { at: order.createdAt, label: t("order") },
    { at: order.paidAt, label: ts("paid") },
    { at: order.shippedAt, label: ts("shipped") },
    { at: order.deliveredAt, label: ts("delivered") },
    { at: order.disputeOpenedAt, label: ts("disputed") },
    { at: order.completedAt, label: ts("completed") },
    { at: order.payoutReleasedAt, label: t("payoutReleased") },
    { at: order.cancelledAt, label: ts("cancelled") },
  ].filter((entry) => entry.at);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("order")} <span className="tabular">{order.reference}</span>
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            <Link href={`/${locale}/geraete/${data.listingSlug}`} className="hover:underline">
              {data.listingTitle}
            </Link>
          </p>
          <p className="mt-0.5 text-xs text-fg-subtle">
            {t("seller")}: {data.sellerOrgName ?? data.sellerName} · {t("buyer")}: {data.buyerName}
          </p>
        </div>
        <Badge tone={statusTone[order.status]}>{ts(order.status)}</Badge>
      </div>

      <MilestoneBar
        steps={[t("stepOffer"), t("stepPayment"), t("stepShipping"), t("stepCheck"), t("stepPayout")]}
        current={milestoneIndex(order.status)}
      />

      <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-info-subtle px-3 py-2.5 text-sm text-info">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t("payoutNote")}
      </p>

      {order.status === "completed" ? (
        <p className="rounded-[var(--radius-md)] bg-success-subtle px-3 py-2.5 text-sm text-success">
          {th("orderCompleted")}
        </p>
      ) : null}

      {order.disputeReason ? (
        <Card>
          <CardHeader title={ts("disputed")} />
          <CardBody className="space-y-2 text-sm">
            <p className="text-fg-muted">{order.disputeReason}</p>
            {order.disputeResolution ? (
              <p className="border-t border-border pt-2 text-fg">{order.disputeResolution}</p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {available.length ? (
        <Card>
          <CardHeader title={tc("next")} />
          <CardBody className="flex flex-wrap gap-2">
            {order.status === "pending_payment" && actor === "buyer" ? (
              <Link href={`/${locale}/kaufen/${id}`} className={buttonClass("primary", "sm")}>
                {t("payNow")}
              </Link>
            ) : null}

            {available.includes("shipped") ? (
              <OrderActionButton
                locale={locale}
                orderId={id}
                to="shipped"
                label={t("markShipped")}
                withTracking
                labels={labels}
              />
            ) : null}

            {available.includes("delivered") ? (
              <OrderActionButton
                locale={locale}
                orderId={id}
                to="delivered"
                label={ts("delivered")}
                variant="secondary"
                labels={labels}
              />
            ) : null}

            {available.includes("completed") ? (
              <OrderActionButton
                locale={locale}
                orderId={id}
                to="completed"
                label={t("confirmReceipt")}
                labels={labels}
              />
            ) : null}

            {available.includes("disputed") ? (
              <OrderActionButton
                locale={locale}
                orderId={id}
                to="disputed"
                label={t("openDispute")}
                variant="danger"
                withReason
                labels={labels}
              />
            ) : null}

            {available.includes("cancelled") ? (
              <OrderActionButton
                locale={locale}
                orderId={id}
                to="cancelled"
                label={t("cancel")}
                variant="ghost"
                labels={labels}
              />
            ) : null}

            {available.includes("refunded") ? (
              <OrderActionButton
                locale={locale}
                orderId={id}
                to="refunded"
                label={ts("refunded")}
                variant="danger"
                labels={labels}
              />
            ) : null}

            {isAdmin && order.status === "pending_payment" && order.paymentMethod === "bank_transfer" ? (
              <form action={confirmTransferAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="orderId" value={id} />
                <button type="submit" className={buttonClass("secondary", "sm")}>
                  {t("markTransferReceived")}
                </button>
              </form>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {available.includes("completed") ? (
        <p className="text-xs text-fg-subtle">{t("confirmReceiptHint")}</p>
      ) : null}

      <Card>
        <CardHeader
          title={t("total")}
          action={
            <Link
              href={`/${locale}/bestellung/${id}/rechnung`}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <FileText className="size-3.5" aria-hidden="true" />
              {t("invoiceLink")}
            </Link>
          }
        />
        <CardBody>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">{t("itemPrice")}</dt>
              <dd className="tabular">{formatMoney(totals.itemCents, order.currency, locale)}</dd>
            </div>
            {totals.shippingCents > 0 ? (
              <div className="flex justify-between gap-3">
                <dt className="text-fg-muted">{t("shipping")}</dt>
                <dd className="tabular">{formatMoney(totals.shippingCents, order.currency, locale)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3 border-t border-border pt-1.5 font-semibold">
              <dt>{t("total")}</dt>
              <dd className="tabular">{formatMoney(totals.totalCents, order.currency, locale)}</dd>
            </div>
            <div className="flex justify-between gap-3 pt-2 text-xs text-fg-subtle">
              <dt>{t("platformFee")}</dt>
              <dd className="tabular">− {formatMoney(totals.feeCents, order.currency, locale)}</dd>
            </div>
            <div className="flex justify-between gap-3 text-xs">
              <dt className="text-fg-muted">{t("sellerReceives")}</dt>
              <dd className="tabular font-medium">
                {formatMoney(totals.sellerNetCents, order.currency, locale)}
              </dd>
            </div>
            {order.refundedCents > 0 ? (
              <div className="flex justify-between gap-3 text-xs text-danger">
                <dt>{ts("refunded")}</dt>
                <dd className="tabular">{formatMoney(order.refundedCents, order.currency, locale)}</dd>
              </div>
            ) : null}
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("timeline")} />
        <CardBody>
          <ol className="space-y-2 text-sm">
            {timeline.map((entry) => (
              <li key={entry.label} className="flex justify-between gap-3">
                <span className="text-fg">{entry.label}</span>
                <time className="tabular text-xs text-fg-subtle">
                  {formatDateTime(entry.at, locale)}
                </time>
              </li>
            ))}
          </ol>
          {data.events.length ? (
            <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-fg-subtle">
              {data.events.map((event) => (
                <li key={event.id} className="tabular flex justify-between gap-3">
                  <span>{event.type}</span>
                  <span>{formatDateTime(event.createdAt, locale)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

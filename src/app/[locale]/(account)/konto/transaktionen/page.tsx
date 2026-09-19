import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { ordersForUser } from "@/domain/orders";
import { formatDate, formatMoney } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { ButtonLink } from "@/ui/button";
import { Card, CardBody, CardHeader } from "@/ui/card";
import { EmptyState } from "@/ui/empty-state";

export const metadata = { robots: { index: false } };

const tone = {
  pending_payment: "warning",
  paid: "info",
  shipped: "info",
  delivered: "primary",
  completed: "success",
  cancelled: "neutral",
  disputed: "danger",
  refunded: "neutral",
} as const;

export default async function TransactionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "orders" });
  const ts = await getTranslations({ locale, namespace: "orderStatus" });
  const tn = await getTranslations({ locale, namespace: "nav" });

  const { buying, selling } = await ordersForUser(user.id);

  const section = (title: string, rows: typeof buying) => (
    <Card>
      <CardHeader title={title} />
      <CardBody>
        {rows.length === 0 ? (
          <EmptyState title={t("noOrders")} />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.order.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/${locale}/bestellung/${row.order.id}`}
                    className="font-medium text-fg hover:underline"
                  >
                    {row.listingTitle}
                  </Link>
                  <p className="tabular text-xs text-fg-subtle">
                    {row.order.reference} · {row.counterpartName} ·{" "}
                    {formatDate(row.order.createdAt, locale)}
                  </p>
                </div>
                <Badge tone={tone[row.order.status]}>{ts(row.order.status)}</Badge>
                <span className="tabular font-semibold">
                  {formatMoney(row.order.amountCents, row.order.currency, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <ButtonLink href={`/${locale}/suche`} variant="secondary" size="sm">
          {tn("discover")}
        </ButtonLink>
      </div>
      {section(t("buying"), buying)}
      {section(t("selling"), selling)}
    </div>
  );
}

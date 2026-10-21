import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/auth/session";
import { adminOrders } from "@/db/queries/admin";
import { formatDate, formatMoney } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { Table, Td, Th } from "@/ui/table";
import { Tabs } from "@/ui/tabs";

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const { status } = await searchParams;

  const t = await getTranslations({ locale, namespace: "admin" });
  const ts = await getTranslations({ locale, namespace: "orderStatus" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const rows = await adminOrders(status);
  const base = `/${locale}/admin/transaktionen`;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight">{t("orders")}</h1>
      <Tabs
        items={[
          { href: base, label: tc("all"), active: !status },
          ...(["pending_payment", "paid", "shipped", "delivered", "disputed", "completed", "refunded", "cancelled"] as const).map(
            (value) => ({ href: `${base}?status=${value}`, label: ts(value), active: status === value }),
          ),
        ]}
      />
      <Table>
        <thead>
          <tr>
            <Th>{t("object")}</Th>
            <Th>{t("users")}</Th>
            <Th>{tc("results")}</Th>
            <Th>{t("when")}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <Td>
                <Link href={`/${locale}/bestellung/${row.id}`} className="text-fg hover:underline">
                  {row.listingTitle}
                </Link>
                <p className="tabular text-xs text-fg-subtle">{row.reference}</p>
                <p className="mt-1">
                  <Badge tone={row.status === "disputed" ? "danger" : row.status === "completed" ? "success" : "neutral"}>
                    {ts(row.status)}
                  </Badge>
                </p>
                {row.disputeReason ? (
                  <p className="mt-1 max-w-md text-xs text-danger">{row.disputeReason}</p>
                ) : null}
              </Td>
              <Td className="text-sm text-fg-muted">
                {row.buyerName} ← {row.sellerName}
              </Td>
              <Td className="tabular whitespace-nowrap">
                {formatMoney(row.amountCents, row.currency, locale)}
                <span className="block text-xs text-fg-subtle">
                  {formatMoney(row.sellerFeeCents + row.buyerFeeCents, row.currency, locale)}
                </span>
              </Td>
              <Td className="tabular whitespace-nowrap text-xs text-fg-subtle">
                {formatDate(row.createdAt, locale)}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

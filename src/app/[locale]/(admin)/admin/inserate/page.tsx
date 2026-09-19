import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/auth/session";
import { adminListings } from "@/db/queries/admin";
import { listingAdminAction } from "@/actions/admin";
import { formatDate, formatMoney } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { Table, Td, Th } from "@/ui/table";
import { Tabs } from "@/ui/tabs";

export default async function AdminListingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; deleted?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const { status, deleted } = await searchParams;

  const t = await getTranslations({ locale, namespace: "admin" });
  const ts = await getTranslations({ locale, namespace: "status" });
  const tc = await getTranslations({ locale, namespace: "common" });

  const rows = await adminListings(status, deleted === "1");
  const base = `/${locale}/admin/inserate`;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight">{t("listings")}</h1>

      <Tabs
        items={[
          { href: base, label: tc("all"), active: !status && deleted !== "1" },
          ...(["pending_review", "active", "reserved", "sold", "withdrawn", "draft"] as const).map((value) => ({
            href: `${base}?status=${value}`,
            label: ts(value),
            active: status === value,
          })),
          { href: `${base}?deleted=1`, label: t("hide"), active: deleted === "1" },
        ]}
      />

      <Table>
        <thead>
          <tr>
            <Th>{t("object")}</Th>
            <Th>{t("users")}</Th>
            <Th>{tc("results")}</Th>
            <Th>{t("when")}</Th>
            <Th>{t("action")}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <Td>
                <Link href={`/${locale}/geraete/${row.slug}`} className="text-fg hover:underline">
                  {row.title}
                </Link>
                <p className="tabular text-xs text-fg-subtle">{row.reference}</p>
                <p className="mt-1 flex flex-wrap gap-1">
                  <Badge tone={row.deletedAt ? "danger" : "neutral"}>
                    {row.deletedAt ? t("hide") : ts(row.status)}
                  </Badge>
                  {row.verifiedAt ? <Badge tone="success">✓</Badge> : null}
                  {row.featuredUntil && row.featuredUntil > new Date() ? (
                    <Badge tone="primary">{t("feature")}</Badge>
                  ) : null}
                </p>
              </Td>
              <Td>
                <Link href={`/${locale}/admin/nutzende/${row.sellerId}`} className="text-fg-muted hover:underline">
                  {row.organisationName ?? row.sellerName}
                </Link>
              </Td>
              <Td className="tabular whitespace-nowrap">
                {formatMoney(row.priceCents, row.currency, locale)}
              </Td>
              <Td className="tabular whitespace-nowrap text-xs text-fg-subtle">
                {formatDate(row.createdAt, locale)}
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1.5">
                  {row.status === "pending_review" ? (
                    <form action={listingAdminAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="listingId" value={row.id} />
                      <input type="hidden" name="intent" value="approve" />
                      <button className="rounded-[var(--radius-sm)] bg-primary px-2 py-1 text-xs font-medium text-primary-fg">
                        {t("approve")}
                      </button>
                    </form>
                  ) : null}
                  <form action={listingAdminAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="listingId" value={row.id} />
                    <input type="hidden" name="intent" value={row.verifiedAt ? "unverify" : "verify"} />
                    <button className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs text-fg-muted hover:bg-bg-subtle">
                      {row.verifiedAt ? t("unverify") : t("verify")}
                    </button>
                  </form>
                  <form action={listingAdminAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="listingId" value={row.id} />
                    <input type="hidden" name="intent" value={row.featuredUntil && row.featuredUntil > new Date() ? "unfeature" : "feature"} />
                    <button className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs text-fg-muted hover:bg-bg-subtle">
                      {t("feature")}
                    </button>
                  </form>
                  <form action={listingAdminAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="listingId" value={row.id} />
                    <input type="hidden" name="intent" value={row.deletedAt ? "restore" : "hide"} />
                    <button className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs text-fg-muted hover:bg-bg-subtle">
                      {row.deletedAt ? t("restore") : t("hide")}
                    </button>
                  </form>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

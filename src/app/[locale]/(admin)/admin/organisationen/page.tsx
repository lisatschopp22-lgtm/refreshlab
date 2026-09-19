import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/auth/session";
import { adminOrganisations } from "@/db/queries/admin";
import { organisationAction } from "@/actions/admin";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { Table, Td, Th } from "@/ui/table";

export default async function AdminOrganisationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireAdmin(locale);

  const t = await getTranslations({ locale, namespace: "admin" });
  const rows = await adminOrganisations();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight">{t("organisations")}</h1>
      <Table>
        <thead>
          <tr>
            <Th>{t("organisations")}</Th>
            <Th>{t("users")}</Th>
            <Th>{t("listings")}</Th>
            <Th>{t("action")}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <Td>
                <Link href={`/${locale}/anbieter/${row.slug}`} className="text-fg hover:underline">
                  {row.name}
                </Link>
                <p className="text-xs text-fg-subtle">
                  {row.type} · {row.city}, {row.country}
                </p>
                {row.verifiedAt ? <Badge tone="success" className="mt-1">{t("verify")}</Badge> : null}
              </Td>
              <Td className="tabular">{row.memberCount}</Td>
              <Td className="tabular">{row.listingCount}</Td>
              <Td>
                <form action={organisationAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="organisationId" value={row.id} />
                  <input type="hidden" name="intent" value={row.verifiedAt ? "unverify" : "verify"} />
                  <button className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs text-fg-muted hover:bg-bg-subtle">
                    {row.verifiedAt ? t("unverify") : t("verify")}
                  </button>
                </form>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

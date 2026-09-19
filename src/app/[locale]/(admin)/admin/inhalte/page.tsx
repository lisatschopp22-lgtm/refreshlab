import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/auth/session";
import { adminPages } from "@/db/queries/admin";
import { formatDateTime, pick } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { ButtonLink } from "@/ui/button";
import { Table, Td, Th } from "@/ui/table";

export default async function AdminPagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireAdmin(locale);

  const t = await getTranslations({ locale, namespace: "admin" });
  const pages = await adminPages();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">{t("pages")}</h1>
        <ButtonLink href={`/${locale}/admin/inhalte/neu`} size="sm">
          {t("newPage")}
        </ButtonLink>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>{t("pages")}</Th>
            <Th>{t("published")}</Th>
            <Th>{t("when")}</Th>
            <Th>{t("action")}</Th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <tr key={page.id}>
              <Td>
                <p className="font-medium text-fg">{pick(page.title, locale)}</p>
                <p className="tabular text-xs text-fg-subtle">/{page.slug}</p>
              </Td>
              <Td>
                <Badge tone={page.published ? "success" : "neutral"}>
                  {page.published ? t("published") : "—"}
                </Badge>
                {page.showInFooter ? <Badge tone="outline" className="ml-1">footer</Badge> : null}
              </Td>
              <Td className="tabular whitespace-nowrap text-xs text-fg-subtle">
                {formatDateTime(page.updatedAt, locale)}
              </Td>
              <Td>
                <div className="flex gap-2 text-xs">
                  <Link href={`/${locale}/admin/inhalte/${page.slug}`} className="text-primary hover:underline">
                    {t("editPage")}
                  </Link>
                  <Link href={`/${locale}/p/${page.slug}`} className="text-fg-muted hover:underline">
                    {t("review")}
                  </Link>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

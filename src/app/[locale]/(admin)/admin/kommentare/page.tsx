import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/auth/session";
import { adminComments } from "@/db/queries/admin";
import { commentAdminAction } from "@/actions/admin";
import { formatDateTime } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { Table, Td, Th } from "@/ui/table";

export default async function AdminCommentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireAdmin(locale);

  const t = await getTranslations({ locale, namespace: "admin" });
  const rows = await adminComments();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight">{t("comments")}</h1>
      <Table>
        <thead>
          <tr>
            <Th>{t("object")}</Th>
            <Th>{t("users")}</Th>
            <Th>{t("when")}</Th>
            <Th>{t("action")}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const href = row.modelSlug
              ? `/${locale}/modell/${row.modelSlug}`
              : row.listingSlug
                ? `/${locale}/geraete/${row.listingSlug}`
                : null;
            return (
              <tr key={row.id}>
                <Td className="max-w-md">
                  <p className="line-clamp-2 text-fg-muted">{row.body}</p>
                  <p className="mt-1 flex flex-wrap gap-1">
                    <Badge tone="outline">{row.targetType}</Badge>
                    {row.deletedAt ? <Badge tone="danger">{t("hide")}</Badge> : null}
                    {row.status === "hidden" ? <Badge tone="warning">{t("hide")}</Badge> : null}
                    {href ? (
                      <Link href={href} className="text-xs text-primary hover:underline">
                        {t("review")}
                      </Link>
                    ) : null}
                  </p>
                </Td>
                <Td>
                  <Link href={`/${locale}/admin/nutzende/${row.authorId}`} className="text-fg-muted hover:underline">
                    {row.authorName}
                  </Link>
                </Td>
                <Td className="tabular whitespace-nowrap text-xs text-fg-subtle">
                  {formatDateTime(row.createdAt, locale)}
                </Td>
                <Td>
                  <div className="flex gap-1.5">
                    <form action={commentAdminAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="commentId" value={row.id} />
                      <input type="hidden" name="intent" value={row.status === "hidden" ? "show" : "hide"} />
                      <button className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs text-fg-muted hover:bg-bg-subtle">
                        {row.status === "hidden" ? t("restore") : t("hide")}
                      </button>
                    </form>
                    {!row.deletedAt ? (
                      <form action={commentAdminAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="commentId" value={row.id} />
                        <input type="hidden" name="intent" value="delete" />
                        <button className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs text-fg-muted hover:text-danger">
                          {t("hide")} ✕
                        </button>
                      </form>
                    ) : null}
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}

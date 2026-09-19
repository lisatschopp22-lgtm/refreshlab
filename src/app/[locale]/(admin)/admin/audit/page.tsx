import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/auth/session";
import { adminAuditLog } from "@/db/queries/admin";
import { formatDateTime } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { EmptyState } from "@/ui/empty-state";
import { Table, Td, Th } from "@/ui/table";

export default async function AdminAuditPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireAdmin(locale);

  const t = await getTranslations({ locale, namespace: "admin" });
  const rows = await adminAuditLog();

  const diff = (before: unknown, after: unknown) => {
    if (!before && !after) return null;
    const keys = new Set([
      ...Object.keys((before as Record<string, unknown>) ?? {}),
      ...Object.keys((after as Record<string, unknown>) ?? {}),
    ]);
    const changes = [...keys]
      .map((key) => {
        const from = (before as Record<string, unknown>)?.[key];
        const to = (after as Record<string, unknown>)?.[key];
        if (JSON.stringify(from) === JSON.stringify(to)) return null;
        return `${key}: ${JSON.stringify(from) ?? "—"} → ${JSON.stringify(to) ?? "—"}`;
      })
      .filter(Boolean);
    return changes.length ? changes.join("\n") : null;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight">{t("audit")}</h1>
      {rows.length === 0 ? (
        <EmptyState title={t("noAudit")} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("when")}</Th>
              <Th>{t("actor")}</Th>
              <Th>{t("action")}</Th>
              <Th>{t("changes")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const changes = diff(row.before, row.after);
              return (
                <tr key={row.id}>
                  <Td className="tabular whitespace-nowrap text-xs text-fg-subtle">
                    {formatDateTime(row.createdAt, locale)}
                  </Td>
                  <Td className="whitespace-nowrap text-fg-muted">{row.actorName ?? "—"}</Td>
                  <Td>
                    <Badge tone="outline">{row.action}</Badge>
                    <p className="tabular mt-1 text-xs text-fg-subtle">
                      {row.targetType}
                      {row.targetId ? ` · ${row.targetId.slice(0, 8)}` : ""}
                    </p>
                    {row.summary ? <p className="mt-0.5 max-w-xs truncate text-xs text-fg-muted">{row.summary}</p> : null}
                  </Td>
                  <Td className="max-w-sm">
                    {changes ? (
                      <pre className="tabular whitespace-pre-wrap text-xs text-fg-muted">{changes}</pre>
                    ) : (
                      <span className="text-xs text-fg-subtle">—</span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}

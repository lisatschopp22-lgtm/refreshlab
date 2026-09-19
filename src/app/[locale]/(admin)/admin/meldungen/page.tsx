import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/auth/session";
import { moderationQueue } from "@/db/queries/admin";
import { reportAction } from "@/actions/admin";
import { formatDateTime } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { Card, CardBody } from "@/ui/card";
import { EmptyState } from "@/ui/empty-state";

export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireAdmin(locale);

  const t = await getTranslations({ locale, namespace: "admin" });
  const reports = await moderationQueue(100);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight">{t("reports")}</h1>
      {reports.length === 0 ? (
        <EmptyState title={t("noAudit")} />
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => {
            const score = report.riskScore?.score ?? 0;
            return (
              <li key={report.id}>
                <Card>
                  <CardBody className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2">
                          <Badge tone={score >= 80 ? "danger" : score >= 50 ? "warning" : "neutral"}>
                            <span className="tabular">{score}</span>
                          </Badge>
                          <Badge tone="outline">{report.targetType}</Badge>
                          <Badge tone={report.status === "open" ? "primary" : "neutral"}>
                            {report.status}
                          </Badge>
                          {report.riskScore?.signals.map((signal) => (
                            <Badge key={signal} tone="neutral">{signal}</Badge>
                          ))}
                        </p>
                        <p className="mt-1.5 font-medium text-fg">{report.subject ?? report.targetId}</p>
                        <p className="text-sm text-fg-muted">{report.detail}</p>
                        <p className="tabular mt-1 text-xs text-fg-subtle">
                          {report.reporterName ?? "—"} · {formatDateTime(report.createdAt, locale)}
                        </p>
                      </div>
                      {report.listingSlug ? (
                        <Link
                          href={`/${locale}/geraete/${report.listingSlug}`}
                          className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs text-fg-muted hover:bg-bg-subtle"
                        >
                          {t("review")}
                        </Link>
                      ) : null}
                    </div>

                    {report.status === "open" ? (
                      <form action={reportAction} className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="reportId" value={report.id} />
                        <label className="flex-1">
                          <span className="mb-1 block text-xs text-fg-subtle">{t("resolutionNote")}</span>
                          <input
                            name="note"
                            className="h-9 w-full rounded-[var(--radius-md)] border border-border-strong bg-bg-elevated px-3 text-sm"
                          />
                        </label>
                        <button
                          name="intent"
                          value="resolve"
                          className="h-9 rounded-[var(--radius-md)] bg-primary px-3 text-sm font-medium text-primary-fg"
                        >
                          {t("resolve")}
                        </button>
                        <button
                          name="intent"
                          value="dismiss"
                          className="h-9 rounded-[var(--radius-md)] border border-border px-3 text-sm text-fg-muted"
                        >
                          {t("dismiss")}
                        </button>
                      </form>
                    ) : null}
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

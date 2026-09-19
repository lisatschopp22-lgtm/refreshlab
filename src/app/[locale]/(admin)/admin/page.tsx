import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/auth/session";
import { adminOverview, moderationQueue } from "@/db/queries/admin";
import { marketplaceMetrics } from "@/domain/admin";
import { reportAction, runOutboxAction } from "@/actions/admin";
import { formatMoney, formatNumber, relativeTime } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { buttonClass } from "@/ui/button";
import { Card, CardBody, CardHeader } from "@/ui/card";
import { EmptyState } from "@/ui/empty-state";
import { Table, Td, Th } from "@/ui/table";

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireAdmin(locale);

  const t = await getTranslations({ locale, namespace: "admin" });
  const tr = await getTranslations({ locale, namespace: "report" });
  const tc = await getTranslations({ locale, namespace: "common" });

  const [overview, queue, metrics] = await Promise.all([
    adminOverview(),
    moderationQueue(12),
    marketplaceMetrics(),
  ]);

  const reasonLabel: Record<string, string> = {
    spam: tr("reasonSpam"),
    off_platform: tr("reasonOffPlatform"),
    misleading: tr("reasonMisleading"),
    duplicate: tr("reasonDuplicate"),
    prohibited: tr("reasonProhibited"),
    other: tr("reasonOther"),
    price_suspicious: tr("reasonMisleading"),
    missing_documents: tr("reasonProhibited"),
  };

  const kpis = [
    { label: t("kpiListings"), value: formatNumber(overview.activeListings, locale), note: `${overview.pendingListings} ${t("review").toLowerCase()}` },
    { label: t("kpiUsers"), value: formatNumber(overview.users, locale), note: `${overview.suspendedUsers} ${t("suspend").toLowerCase()}` },
    { label: t("kpiReports"), value: formatNumber(overview.openReports, locale), note: `${overview.highRiskReports} ${t("risk").toLowerCase()}` },
    { label: t("kpiOrders"), value: formatNumber(overview.openOrders, locale), note: `${overview.disputes} ${t("orders").toLowerCase()}` },
    { label: t("kpiGmv"), value: formatMoney(Number(overview.gmvCents), "CHF", locale), note: formatMoney(Number(overview.feeCents), "CHF", locale) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xs uppercase tracking-[0.2em] text-fg-subtle">{t("operations")}</h1>
        <form action={runOutboxAction}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className={buttonClass("secondary", "sm")}>
            Outbox ({overview.deadLetters})
          </button>
        </form>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <li key={kpi.label}>
            <Card>
              <CardBody>
                <p className="text-xs uppercase tracking-wide text-fg-subtle">{kpi.label}</p>
                <p className="tabular mt-1 text-2xl font-bold text-fg">{kpi.value}</p>
                <p className="tabular mt-0.5 text-xs text-fg-subtle">{kpi.note}</p>
              </CardBody>
            </Card>
          </li>
        ))}
      </ul>

      <Card>
        <CardHeader
          title={t("moderationQueue")}
          description={`${overview.openReports} ${t("reports").toLowerCase()}`}
          action={
            <Link href={`/${locale}/admin/meldungen`} className="text-sm text-primary hover:underline">
              {tc("all")} →
            </Link>
          }
        />
        <CardBody className="p-0">
          {queue.length === 0 ? (
            <EmptyState title={t("noAudit")} className="m-4" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t("object")}</Th>
                  <Th>{t("risk")}</Th>
                  <Th>{t("reason")}</Th>
                  <Th>{t("when")}</Th>
                  <Th>{t("action")}</Th>
                </tr>
              </thead>
              <tbody>
                {queue.map((report) => {
                  const score = report.riskScore?.score ?? 0;
                  return (
                    <tr key={report.id}>
                      <Td>
                        <p className="max-w-xs truncate text-fg">{report.subject ?? report.targetId}</p>
                        <p className="tabular text-xs text-fg-subtle">
                          {report.targetType} · {report.reporterName ?? "—"}
                        </p>
                      </Td>
                      <Td>
                        <Badge tone={score >= 80 ? "danger" : score >= 50 ? "warning" : "neutral"}>
                          <span className="tabular">{score}</span>
                        </Badge>
                      </Td>
                      <Td className="max-w-xs">
                        <p className="truncate text-fg-muted">
                          {reasonLabel[report.reason] ?? report.reason}
                        </p>
                        {report.detail ? (
                          <p className="truncate text-xs text-fg-subtle">{report.detail}</p>
                        ) : null}
                      </Td>
                      <Td className="whitespace-nowrap text-xs text-fg-subtle">
                        {relativeTime(report.createdAt, locale)}
                      </Td>
                      <Td>
                        {report.status === "open" ? (
                          <div className="flex gap-1.5">
                            {report.listingSlug ? (
                              <Link
                                href={`/${locale}/geraete/${report.listingSlug}`}
                                className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs text-fg-muted hover:bg-bg-subtle"
                              >
                                {t("review")}
                              </Link>
                            ) : null}
                            <form action={reportAction}>
                              <input type="hidden" name="locale" value={locale} />
                              <input type="hidden" name="reportId" value={report.id} />
                              <input type="hidden" name="intent" value="resolve" />
                              <button className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs text-fg-muted hover:bg-bg-subtle">
                                {t("resolve")}
                              </button>
                            </form>
                            <form action={reportAction}>
                              <input type="hidden" name="locale" value={locale} />
                              <input type="hidden" name="reportId" value={report.id} />
                              <input type="hidden" name="intent" value="dismiss" />
                              <button className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs text-fg-muted hover:bg-bg-subtle">
                                {t("dismiss")}
                              </button>
                            </form>
                          </div>
                        ) : (
                          <Badge tone="neutral">{report.status}</Badge>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("overview")} />
          <CardBody>
            <dl className="space-y-2 text-sm">
              {[
                [locale === "de" ? "Inserate mit Angeboten" : "Listings with offers", formatNumber(metrics.listingsWithOffers, locale)],
                [locale === "de" ? "Verkauft" : "Sold", formatNumber(metrics.soldListings, locale)],
                [locale === "de" ? "Median bis Verkauf (Tage)" : "Median days to sell", metrics.medianDaysToSell == null ? "—" : Math.round(Number(metrics.medianDaysToSell)).toString()],
                [locale === "de" ? "Streitfallquote" : "Dispute rate", `${metrics.disputeRate} %`],
                [t("pendingModels"), formatNumber(overview.pendingModels, locale)],
                [t("openOffers") ?? "", formatNumber(overview.openOffers, locale)],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between gap-3">
                  <dt className="text-fg-muted">{label}</dt>
                  <dd className="tabular text-fg">{value}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("pendingListings")} />
          <CardBody>
            <p className="tabular text-3xl font-bold text-fg">{overview.pendingListings}</p>
            <Link
              href={`/${locale}/admin/inserate?status=pending_review`}
              className="mt-2 inline-block text-sm text-primary hover:underline"
            >
              {t("review")} →
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

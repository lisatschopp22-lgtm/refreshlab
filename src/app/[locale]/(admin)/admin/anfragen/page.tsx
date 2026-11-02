import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { desc, eq, sql } from "drizzle-orm";
import { Mail, MapPin, Phone } from "lucide-react";
import { requireAdmin } from "@/auth/session";
import { db } from "@/db/client";
import { serviceRequests } from "@/db/schema/operations";
import { serviceKinds, serviceStatuses, type ServiceKind } from "@/domain/service-requests";
import { updateServiceRequestAction } from "@/actions/service-requests";
import { formatDateTime } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { buttonClass } from "@/ui/button";
import { Card, CardBody } from "@/ui/card";
import { cn } from "@/ui/cn";
import { Select, Textarea } from "@/ui/field";

const tone = { open: "warning", in_progress: "info", done: "success", declined: "neutral" } as const;

export default async function AdminServiceRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ art?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const { art } = await searchParams;
  const kind = serviceKinds.includes(art as ServiceKind) ? (art as ServiceKind) : undefined;

  const t = await getTranslations({ locale, namespace: "admin" });
  const rows = await db
    .select()
    .from(serviceRequests)
    .where(kind ? eq(serviceRequests.kind, kind) : undefined)
    // Open ones first, then the newest.
    .orderBy(sql`${serviceRequests.status} <> 'open'`, desc(serviceRequests.createdAt));

  const kindLabel = (value: ServiceKind) => t(`requestKind_${value}`);
  const detailLabel = (key: string) => t(`requestDetail_${key}`);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t("requests")}</h1>
        <p className="mt-1 text-sm text-fg-muted">{t("requestsIntro")}</p>
      </div>

      <nav className="flex flex-wrap gap-2">
        {[undefined, ...serviceKinds].map((value) => (
          <Link
            key={value ?? "all"}
            href={value ? `/${locale}/admin/anfragen?art=${value}` : `/${locale}/admin/anfragen`}
            className={cn(
              "rounded-[var(--radius-full)] border px-3 py-1 text-sm",
              value === kind ? "border-[var(--primary)] bg-primary-subtle text-primary-subtle-fg" : "border-border text-fg-muted hover:bg-bg-subtle",
            )}
          >
            {value ? kindLabel(value) : t("requestsAll")}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="text-sm text-fg-subtle">{t("requestsEmpty")}</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.id}>
              <Card>
                <CardBody className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="primary">{kindLabel(row.kind)}</Badge>
                    <Badge tone={tone[row.status]}>{t(`requestStatus_${row.status}`)}</Badge>
                    <span className="tabular ml-auto text-xs text-fg-subtle">{formatDateTime(row.createdAt, locale)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-fg">
                      {row.contactName}
                      {row.organisationName ? <span className="font-normal text-fg-muted"> · {row.organisationName}</span> : null}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
                      <a href={`mailto:${row.email}`} className="inline-flex items-center gap-1 hover:underline">
                        <Mail className="size-3.5" aria-hidden="true" />
                        {row.email}
                      </a>
                      {row.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="size-3.5" aria-hidden="true" />
                          {row.phone}
                        </span>
                      ) : null}
                      {row.location ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" aria-hidden="true" />
                          {row.location}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  {Object.keys(row.details).length ? (
                    <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                      {Object.entries(row.details).map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <dt className="text-fg-subtle">{detailLabel(key)}:</dt>
                          <dd className="text-fg">{value === "yes" ? t("requestYes") : value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {row.message ? <p className="whitespace-pre-line text-sm leading-relaxed text-fg-muted">{row.message}</p> : null}

                  <form action={updateServiceRequestAction} className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={row.id} />
                    <Select name="status" defaultValue={row.status} aria-label={t("requestStatus")} className="h-9 w-44">
                      {serviceStatuses.map((status) => (
                        <option key={status} value={status}>
                          {t(`requestStatus_${status}`)}
                        </option>
                      ))}
                    </Select>
                    <Textarea
                      name="adminNote"
                      defaultValue={row.adminNote ?? ""}
                      aria-label={t("note")}
                      placeholder={t("note")}
                      rows={1}
                      className="min-h-9 min-w-48 flex-1 py-1.5"
                    />
                    <button type="submit" className={buttonClass("secondary", "sm")}>
                      {t("requestSave")}
                    </button>
                  </form>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/auth/session";
import { adminModels, adminPendingManufacturers, duplicateModelCandidates } from "@/db/queries/admin";
import { listManufacturers } from "@/db/queries/catalogue";
import { modelAdminAction } from "@/actions/admin";
import { pick } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { Card, CardBody, CardHeader } from "@/ui/card";
import { Table, Td, Th } from "@/ui/table";

export default async function AdminModelsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireAdmin(locale);

  const t = await getTranslations({ locale, namespace: "admin" });
  const [models, duplicates, newManufacturers, publishedManufacturers] = await Promise.all([
    adminModels(),
    duplicateModelCandidates(),
    adminPendingManufacturers(),
    listManufacturers(),
  ]);
  const pending = models.filter((model) => model.status === "pending");

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold tracking-tight">{t("models")}</h1>

      <Card>
        <CardHeader title={t("pendingModels")} description={t("approveModelHint")} />
        <CardBody className="space-y-2">
          {pending.length === 0 ? (
            <p className="text-sm text-fg-subtle">—</p>
          ) : (
            pending.map((model) => (
              <div key={model.id} className="flex flex-wrap items-center gap-3 border-b border-border py-2 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-fg">
                    <span className="truncate">
                      {model.manufacturerName} {model.name}
                    </span>
                    {model.manufacturerStatus === "pending" ? <Badge tone="warning">{t("newManufacturer")}</Badge> : null}
                  </p>
                  <p className="tabular text-xs text-fg-subtle">
                    {model.recordNumber} ·{" "}
                    {model.parentCategoryName ? `${pick(model.parentCategoryName, locale)} › ` : ""}
                    {pick(model.categoryName, locale)} · {model.proposedByName ?? "—"}
                  </p>
                  {model.manufacturerStatus === "pending" && model.manufacturerWebsite ? (
                    <a
                      href={model.manufacturerWebsite}
                      target="_blank"
                      rel="noreferrer nofollow"
                      className="text-xs text-primary hover:underline"
                    >
                      {model.manufacturerWebsite}
                    </a>
                  ) : null}
                </div>
                <Link
                  href={`/${locale}/admin/inserate?status=pending_review`}
                  className="text-xs text-fg-muted hover:underline"
                >
                  <Badge tone="warning">{model.listingCount} {t("listings")}</Badge>
                </Link>
                <form action={modelAdminAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="modelId" value={model.id} />
                  <input type="hidden" name="intent" value="approve" />
                  <button className="rounded-[var(--radius-sm)] bg-primary px-2 py-1 text-xs font-medium text-primary-fg">
                    {t("approve")}
                  </button>
                </form>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      {/* A manufacturer typed by a seller may already exist under another spelling. */}
      <Card>
        <CardHeader title={t("pendingManufacturers")} description={t("pendingManufacturersHint")} />
        <CardBody className="space-y-3">
          {newManufacturers.length === 0 ? (
            <p className="text-sm text-fg-subtle">—</p>
          ) : (
            newManufacturers.map((maker) => (
              <div key={maker.id} className="flex flex-wrap items-end gap-2 border-b border-border pb-3 last:border-b-0">
                <div className="min-w-40 flex-1">
                  <p className="text-sm text-fg">{maker.name}</p>
                  <p className="text-xs text-fg-subtle">
                    {t("modelCount", { count: maker.modelCount })} · {maker.proposedByName ?? "—"}
                  </p>
                  {maker.website ? (
                    <a href={maker.website} target="_blank" rel="noreferrer nofollow" className="text-xs text-primary hover:underline">
                      {maker.website}
                    </a>
                  ) : null}
                </div>
                <form action={modelAdminAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="manufacturerId" value={maker.id} />
                  <input type="hidden" name="intent" value="approveManufacturer" />
                  <button className="h-9 rounded-[var(--radius-md)] bg-primary px-3 text-sm font-medium text-primary-fg">
                    {t("approve")}
                  </button>
                </form>
                <form action={modelAdminAction} className="flex items-end gap-2">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="intent" value="mergeManufacturer" />
                  <input type="hidden" name="sourceId" value={maker.id} />
                  <label className="text-xs text-fg-subtle">
                    <span className="mb-1 block">{t("mergeInto")}</span>
                    <select name="targetId" className="h-9 max-w-56 rounded-[var(--radius-md)] border border-border-strong bg-bg-elevated px-2 text-sm">
                      {publishedManufacturers.map((target) => (
                        <option key={target.id} value={target.id}>
                          {target.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="h-9 rounded-[var(--radius-md)] border border-border px-3 text-sm text-fg-muted hover:bg-bg-subtle">
                    {t("mergeManufacturer")}
                  </button>
                </form>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("mergeModels")} description={`${duplicates.length}`} />
        <CardBody className="space-y-3">
          {duplicates.length === 0 ? (
            <p className="text-sm text-fg-subtle">—</p>
          ) : (
            duplicates.map((group) => (
              <form
                key={`${group.manufacturerName}-${group.name}`}
                action={modelAdminAction}
                className="flex flex-wrap items-end gap-2 border-b border-border pb-3 last:border-b-0"
              >
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="intent" value="merge" />
                <p className="min-w-40 flex-1 text-sm text-fg">
                  {group.manufacturerName} {group.name}
                  <span className="tabular ml-2 text-xs text-fg-subtle">×{group.count}</span>
                </p>
                <label className="text-xs text-fg-subtle">
                  <span className="mb-1 block">{t("mergeModels")}</span>
                  <select name="sourceId" className="h-9 rounded-[var(--radius-md)] border border-border-strong bg-bg-elevated px-2 text-sm">
                    {group.ids.map((id) => (
                      <option key={id} value={id}>{id.slice(0, 8)}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-fg-subtle">
                  <span className="mb-1 block">{t("mergeInto")}</span>
                  <select name="targetId" className="h-9 rounded-[var(--radius-md)] border border-border-strong bg-bg-elevated px-2 text-sm">
                    {group.ids.map((id) => (
                      <option key={id} value={id}>{id.slice(0, 8)}</option>
                    ))}
                  </select>
                </label>
                <button className="h-9 rounded-[var(--radius-md)] border border-border px-3 text-sm text-fg-muted hover:bg-bg-subtle">
                  {t("mergeModels")}
                </button>
              </form>
            ))
          )}
        </CardBody>
      </Card>

      <Table>
        <thead>
          <tr>
            <Th>{t("models")}</Th>
            <Th>{t("object")}</Th>
            <Th>{t("listings")}</Th>
          </tr>
        </thead>
        <tbody>
          {models.slice(0, 80).map((model) => (
            <tr key={model.id}>
              <Td>
                <Link href={`/${locale}/modell/${model.slug}`} className="text-fg hover:underline">
                  {model.manufacturerName} {model.name}
                </Link>
                <p className="tabular text-xs text-fg-subtle">{model.recordNumber}</p>
              </Td>
              <Td>
                <Badge tone={model.status === "pending" ? "warning" : model.status === "merged" ? "neutral" : "success"}>
                  {model.status}
                </Badge>
              </Td>
              <Td className="tabular">{model.listingCount}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

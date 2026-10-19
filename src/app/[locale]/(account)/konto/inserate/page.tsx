import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { myListings } from "@/db/queries/account";
import { setStatusAction } from "@/actions/listings";
import { formatDate, formatMoney, formatNumber } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { ButtonLink } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { StorageImage } from "@/ui/storage-image";
import { Tabs } from "@/ui/tabs";

export const metadata = { robots: { index: false } };

const statusTone = {
  draft: "outline",
  pending_review: "warning",
  active: "success",
  reserved: "info",
  sold: "neutral",
  withdrawn: "neutral",
} as const;

export default async function MyListingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const { status } = await searchParams;

  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "account" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const ts = await getTranslations({ locale, namespace: "status" });
  const tl = await getTranslations({ locale, namespace: "listing" });
  const tsell = await getTranslations({ locale, namespace: "sell" });

  const all = await myListings(user.id, user.organisations.map((o) => o.id));
  const rows = status ? all.filter((row) => row.status === status) : all;

  const counts = all.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  const base = `/${locale}/konto/inserate`;
  const tabs = [
    { href: base, label: locale === "de" ? "Alle" : "All", count: all.length, active: !status },
    ...(["active", "draft", "pending_review", "reserved", "sold", "withdrawn"] as const).map((value) => ({
      href: `${base}?status=${value}`,
      label: ts(value),
      count: counts[value] ?? 0,
      active: status === value,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{tn("myListings")}</h1>
        <ButtonLink href={`/${locale}/verkaufen`}>{tn("sell")}</ButtonLink>
      </div>

      <Tabs items={tabs} />

      {/* Where publishing a new instrument lands: say what happens next. */}
      {status === "pending_review" && rows.length > 0 ? (
        <p className="rounded-[var(--radius-md)] bg-info-subtle px-3 py-2 text-sm text-info">{tsell("pendingReviewNote")}</p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title={t("noListings")}
          action={<ButtonLink href={`/${locale}/verkaufen`} size="sm">{tn("sell")}</ButtonLink>}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-3"
            >
              <div className="relative size-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-bg-sunken">
                <StorageImage path={row.imagePath} alt="" sizes="80px" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone[row.status]}>{ts(row.status)}</Badge>
                  {row.offerCount > 0 ? (
                    <Badge tone="primary">
                      {row.offerCount} {locale === "de" ? "Angebote" : "offers"}
                    </Badge>
                  ) : null}
                  {row.organisationName ? <Badge tone="outline">{row.organisationName}</Badge> : null}
                </p>
                <p className="mt-1 truncate font-medium text-fg">
                  {row.status === "draft" ? (
                    <Link href={`/${locale}/verkaufen/${row.id}/zustand`} className="hover:underline">
                      {row.title}
                    </Link>
                  ) : (
                    <Link href={`/${locale}/geraete/${row.slug}`} className="hover:underline">
                      {row.title}
                    </Link>
                  )}
                </p>
                <p className="tabular mt-0.5 text-xs text-fg-subtle">
                  {row.reference} · {row.locationCity || "—"} ·{" "}
                  {row.publishedAt ? formatDate(row.publishedAt, locale) : "—"} ·{" "}
                  {formatNumber(row.viewCount, locale)} {tl("viewCount")}
                </p>
              </div>

              <p className="tabular shrink-0 font-semibold text-fg">
                {row.priceCents > 0 ? formatMoney(row.priceCents, row.currency, locale) : "—"}
              </p>

              <div className="flex shrink-0 flex-wrap gap-1.5">
                <Link
                  href={`/${locale}/verkaufen/${row.id}/zustand`}
                  className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs text-fg-muted hover:bg-bg-subtle"
                >
                  {locale === "de" ? "Bearbeiten" : "Edit"}
                </Link>
                {row.status === "active" ? (
                  <form action={setStatusAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="listingId" value={row.id} />
                    <input type="hidden" name="status" value="withdrawn" />
                    <button className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs text-fg-muted hover:bg-bg-subtle">
                      {ts("withdrawn")}
                    </button>
                  </form>
                ) : null}
                {row.status === "withdrawn" || row.status === "reserved" ? (
                  <form action={setStatusAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="listingId" value={row.id} />
                    <input type="hidden" name="status" value="active" />
                    <button className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs text-fg-muted hover:bg-bg-subtle">
                      {ts("active")}
                    </button>
                  </form>
                ) : null}
                {row.status === "active" ? (
                  <form action={setStatusAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="listingId" value={row.id} />
                    <input type="hidden" name="status" value="sold" />
                    <button className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs text-fg-muted hover:bg-bg-subtle">
                      {ts("sold")}
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

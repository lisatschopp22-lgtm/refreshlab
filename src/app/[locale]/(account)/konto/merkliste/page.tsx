import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { myWatchlist } from "@/db/queries/account";
import { toggleWatchAction } from "@/actions/listings";
import { formatMoney } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { ButtonLink } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { StorageImage } from "@/ui/storage-image";

export const metadata = { robots: { index: false } };

export default async function WatchlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "account" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const th = await getTranslations({ locale, namespace: "humour" });
  const ts = await getTranslations({ locale, namespace: "status" });

  const rows = await myWatchlist(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{tn("watchlist")}</h1>

      {rows.length === 0 ? (
        <EmptyState
          title={t("noWatchlist")}
          description={th("emptyWatchlist")}
          action={<ButtonLink href={`/${locale}/suche`} size="sm">{tn("discover")}</ButtonLink>}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-3"
            >
              <div className="relative size-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-bg-sunken">
                <StorageImage path={row.imagePath} alt="" sizes="80px" />
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/${locale}/geraete/${row.slug}`} className="font-medium text-fg hover:underline">
                  {row.title}
                </Link>
                <p className="mt-0.5 text-xs text-fg-subtle">
                  {row.year} · {row.locationCity}
                </p>
                {row.status !== "active" ? (
                  <Badge tone="warning" className="mt-1">
                    {ts(row.status)}
                  </Badge>
                ) : null}
              </div>
              <p className="tabular shrink-0 font-semibold">
                {formatMoney(row.priceCents, row.currency, locale)}
              </p>
              <form action={toggleWatchAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="listingId" value={row.id} />
                <button className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs text-fg-muted hover:bg-bg-subtle">
                  {locale === "de" ? "Entfernen" : "Remove"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

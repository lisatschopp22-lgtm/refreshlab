import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { myWatchlist } from "@/db/queries/account";
import { listsOf, MAX_LIST_NAME } from "@/domain/watchlists";
import {
  createListAction,
  deleteListAction,
  moveToListAction,
  removeFromListAction,
  renameListAction,
} from "@/actions/watchlists";
import { formatMoney } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { ButtonLink, buttonClass } from "@/ui/button";
import { cn } from "@/ui/cn";
import { EmptyState } from "@/ui/empty-state";
import { Input, Select } from "@/ui/field";
import { StorageImage } from "@/ui/storage-image";

export const metadata = { robots: { index: false } };

export default async function WatchlistPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ liste?: string; fehler?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const { liste, fehler } = await searchParams;

  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "account" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const th = await getTranslations({ locale, namespace: "humour" });
  const ts = await getTranslations({ locale, namespace: "status" });
  const tw = await getTranslations({ locale, namespace: "lists" });

  const lists = await listsOf(user.id);
  const current = lists.find((list) => list.id === liste) ?? lists[0] ?? null;
  const rows = current ? await myWatchlist(user.id, current.id) : [];
  const others = lists.filter((list) => list.id !== current?.id);
  const listName = (list: { name: string | null }) => list.name ?? tw("defaultList");
  const errors: Record<string, string> = { invalid_name: tw("errorName"), too_many: tw("errorTooMany") };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{tn("watchlist")}</h1>

      {fehler ? (
        <p className="rounded-[var(--radius-md)] bg-danger-subtle px-3 py-2 text-sm text-danger" role="alert">
          {errors[fehler] ?? errors.invalid_name}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {lists.map((list) => (
          <Link
            key={list.id}
            href={`/${locale}/konto/merkliste?liste=${list.id}`}
            aria-current={list.id === current?.id ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border px-3 py-1 text-sm transition-colors",
              list.id === current?.id
                ? "border-[var(--primary)] bg-primary-subtle text-primary-subtle-fg"
                : "border-border text-fg-muted hover:bg-bg-subtle",
            )}
          >
            {listName(list)}
            <span className="tabular text-xs opacity-70">{list.count}</span>
          </Link>
        ))}
        <form action={createListAction} className="flex items-center gap-1.5">
          <input type="hidden" name="locale" value={locale} />
          <Input
            name="name"
            required
            maxLength={MAX_LIST_NAME}
            placeholder={tw("newList")}
            aria-label={tw("newList")}
            className="h-8 w-48"
          />
          <button type="submit" className={buttonClass("secondary", "sm")}>
            {tw("create")}
          </button>
        </form>
      </div>

      {current ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <h2 className="text-lg font-semibold text-fg">
              {listName(current)} <span className="tabular text-sm font-normal text-fg-subtle">· {tw("count", { count: current.count })}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <details className="relative">
                <summary className={cn(buttonClass("ghost", "sm"), "cursor-pointer list-none [&::-webkit-details-marker]:hidden")}>
                  {tw("rename")}
                </summary>
                <form
                  action={renameListAction}
                  className="absolute right-0 top-full z-20 mt-1 flex w-72 gap-1.5 rounded-[var(--radius-md)] border border-border bg-bg-elevated p-2 shadow-lg"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="listId" value={current.id} />
                  <Input
                    name="name"
                    required
                    maxLength={MAX_LIST_NAME}
                    defaultValue={current.name ?? tw("defaultList")}
                    aria-label={tw("rename")}
                    className="h-8 min-w-0 flex-1"
                  />
                  <button type="submit" className={buttonClass("primary", "sm")}>
                    {tw("save")}
                  </button>
                </form>
              </details>
              {/* Deleting asks once more, since what was saved in the list goes with it. */}
              <details className="relative">
                <summary
                  className={cn(buttonClass("ghost", "sm"), "cursor-pointer list-none text-danger [&::-webkit-details-marker]:hidden")}
                >
                  {tw("delete")}
                </summary>
                <form
                  action={deleteListAction}
                  className="absolute right-0 top-full z-20 mt-1 w-72 space-y-2 rounded-[var(--radius-md)] border border-border bg-bg-elevated p-3 shadow-lg"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="listId" value={current.id} />
                  <p className="text-xs text-fg-muted">{tw("deleteHint")}</p>
                  <button type="submit" className={buttonClass("danger", "sm")}>
                    {tw("deleteConfirm")}
                  </button>
                </form>
              </details>
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              title={lists.length > 1 ? tw("empty") : t("noWatchlist")}
              description={th("emptyWatchlist")}
              action={
                <ButtonLink href={`/${locale}/suche`} size="sm">
                  {tn("discover")}
                </ButtonLink>
              }
            />
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => (
                <li key={row.id} className="rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-3">
                  <div className="flex items-center gap-4">
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-bg-sunken">
                      <StorageImage path={row.imagePath} alt="" sizes="80px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/${locale}/geraete/${row.slug}`} className="font-medium text-fg hover:underline">
                        {row.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-fg-subtle">
                        {[row.year, row.locationCity].filter(Boolean).join(" · ")}
                      </p>
                      {row.status !== "active" ? (
                        <Badge tone="warning" className="mt-1">
                          {ts(row.status)}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="tabular shrink-0 font-semibold">{formatMoney(row.priceCents, row.currency, locale)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                    {others.length ? (
                      <form action={moveToListAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="listingId" value={row.id} />
                        <input type="hidden" name="slug" value={row.slug} />
                        <input type="hidden" name="fromListId" value={current.id} />
                        <Select name="toListId" aria-label={tw("moveTo")} className="h-8 w-40">
                          {others.map((list) => (
                            <option key={list.id} value={list.id}>
                              {listName(list)}
                            </option>
                          ))}
                        </Select>
                        <button type="submit" className={buttonClass("secondary", "sm")}>
                          {tw("move")}
                        </button>
                      </form>
                    ) : null}
                    <form action={removeFromListAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="listingId" value={row.id} />
                      <input type="hidden" name="slug" value={row.slug} />
                      <input type="hidden" name="listId" value={current.id} />
                      <button type="submit" className={buttonClass("ghost", "sm")}>
                        {tw("remove")}
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <EmptyState
          title={t("noWatchlist")}
          description={th("emptyWatchlist")}
          action={
            <ButtonLink href={`/${locale}/suche`} size="sm">
              {tn("discover")}
            </ButtonLink>
          }
        />
      )}
    </div>
  );
}

import { Check, ChevronDown, Heart, Plus } from "lucide-react";
import { currentUser } from "@/auth/session";
import { listsHolding, listsOf, MAX_LIST_NAME } from "@/domain/watchlists";
import { createListAction, toggleInListAction, toggleSavedAction } from "@/actions/watchlists";
import { buttonClass } from "./button";
import { cn } from "./cn";
import { Input } from "./field";

/**
 * The heart saves to the first list with one click, or takes the listing out
 * of every list. The arrow next to it opens the lists, to save into others or
 * to start a new one. Plain forms, so it works without JavaScript.
 */
export async function WatchButton({
  listingId,
  slug,
  locale,
  labels,
}: {
  listingId: string;
  slug: string;
  locale: string;
  labels: {
    watch: string;
    unwatch: string;
    chooseLists: string;
    inLists: string;
    defaultList: string;
    newList: string;
    create: string;
    manage: string;
  };
}) {
  const user = await currentUser();

  if (!user) {
    return (
      <a
        href={`/${locale}/anmelden?next=/${locale}/geraete/${slug}`}
        className={buttonClass("ghost", "sm", "flex-1")}
      >
        <Heart className="size-3.5" aria-hidden="true" />
        {labels.watch}
      </a>
    );
  }

  const [lists, holding] = await Promise.all([listsOf(user.id), listsHolding(user.id, listingId)]);
  const saved = holding.length > 0;
  // Before the first save there is no list yet; the first one is made on demand.
  const shown = lists.length ? lists : [{ id: "", name: null }];
  const hidden = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="slug" value={slug} />
    </>
  );

  return (
    <div className="relative flex flex-1">
      <form action={toggleSavedAction} className="flex-1">
        {hidden}
        <button type="submit" className={cn(buttonClass("ghost", "sm"), "w-full rounded-r-none")}>
          <Heart className={cn("size-3.5", saved ? "fill-current text-danger" : "")} aria-hidden="true" />
          {saved ? labels.unwatch : labels.watch}
        </button>
      </form>
      <details>
        <summary
          aria-label={labels.chooseLists}
          title={labels.chooseLists}
          className={cn(
            buttonClass("ghost", "sm"),
            "cursor-pointer list-none rounded-l-none px-2 [&::-webkit-details-marker]:hidden",
          )}
        >
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </summary>
        <div className="absolute right-0 top-full z-20 mt-1 w-72 space-y-2 rounded-[var(--radius-md)] border border-border bg-bg-elevated p-3 shadow-lg">
          <p className="text-xs font-medium text-fg-subtle">{labels.inLists}</p>
          <ul className="space-y-0.5">
            {shown.map((list) => {
              const inList = holding.includes(list.id);
              return (
                <li key={list.id || "first"}>
                  <form action={toggleInListAction}>
                    {hidden}
                    <input type="hidden" name="listId" value={list.id} />
                    <button
                      type="submit"
                      aria-pressed={inList}
                      className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm text-fg hover:bg-bg-subtle"
                    >
                      {inList ? (
                        <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                      ) : (
                        <Plus className="size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
                      )}
                      <span className="truncate">{list.name ?? labels.defaultList}</span>
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
          <form action={createListAction} className="flex gap-1.5 border-t border-border pt-2">
            {hidden}
            <Input
              name="name"
              required
              maxLength={MAX_LIST_NAME}
              placeholder={labels.newList}
              aria-label={labels.newList}
              className="h-8 min-w-0 flex-1"
            />
            <button type="submit" className={buttonClass("secondary", "sm")}>
              {labels.create}
            </button>
          </form>
          <a href={`/${locale}/konto/merkliste`} className="block text-xs text-primary hover:underline">
            {labels.manage} →
          </a>
        </div>
      </details>
    </div>
  );
}

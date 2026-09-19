import { Heart } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { watchlist } from "@/db/schema/marketplace";
import { currentUser } from "@/auth/session";
import { toggleWatchAction } from "@/actions/listings";
import { buttonClass } from "./button";
import { cn } from "./cn";

export async function WatchButton({
  listingId,
  locale,
  labels,
}: {
  listingId: string;
  locale: string;
  labels: { watch: string; unwatch: string };
}) {
  const user = await currentUser();

  if (!user) {
    return (
      <a
        href={`/${locale}/anmelden?next=/${locale}/geraete`}
        className={buttonClass("ghost", "sm", "flex-1")}
      >
        <Heart className="size-3.5" aria-hidden="true" />
        {labels.watch}
      </a>
    );
  }

  const [existing] = await db
    .select({ id: watchlist.id })
    .from(watchlist)
    .where(and(eq(watchlist.profileId, user.id), eq(watchlist.listingId, listingId)))
    .limit(1);

  return (
    <form action={toggleWatchAction} className="flex-1">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="listingId" value={listingId} />
      <button type="submit" className={cn(buttonClass("ghost", "sm"), "w-full")}>
        <Heart
          className={cn("size-3.5", existing ? "fill-current text-danger" : "")}
          aria-hidden="true"
        />
        {existing ? labels.unwatch : labels.watch}
      </button>
    </form>
  );
}

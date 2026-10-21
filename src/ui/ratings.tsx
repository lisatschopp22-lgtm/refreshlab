import { Star } from "lucide-react";
import { formatDate } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { cn } from "./cn";

/** Five stars, filled up to the score rounded to a whole star. */
export function Stars({ score, label, className }: { score: number; label: string; className?: string }) {
  const filled = Math.round(score);
  return (
    <span role="img" aria-label={label} className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={cn("size-[1em]", n <= filled ? "fill-current text-rating" : "text-border-strong")}
        />
      ))}
    </span>
  );
}

/** "★★★★★ 4.8 · 12 ratings", or a quiet note when there are none yet. */
export function RatingSummaryLine({
  average,
  count,
  labels,
  className,
}: {
  average: number | null;
  count: number;
  labels: { stars: string; count: string; none: string };
  className?: string;
}) {
  if (!count || average === null) {
    return <span className={cn("text-xs text-fg-subtle", className)}>{labels.none}</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <Stars score={average} label={labels.stars} />
      <span className="tabular font-medium text-fg">{average.toFixed(1)}</span>
      <span className="text-fg-subtle">· {labels.count}</span>
    </span>
  );
}

export type RatingListEntry = {
  id: string;
  score: number;
  comment: string | null;
  createdAt: Date;
  raterName: string;
  listingTitle: string;
  /** The rater's role, "buyer" or "seller", when the list mixes both. */
  context?: string;
  starsLabel: string;
};

export function RatingList({ items, locale }: { items: RatingListEntry[]; locale: Locale }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="space-y-1.5 py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Stars score={item.score} label={item.starsLabel} className="text-sm" />
            <span className="text-sm font-medium text-fg">{item.raterName}</span>
            {item.context ? <span className="text-xs text-fg-subtle">{item.context}</span> : null}
            <time className="tabular ml-auto text-xs text-fg-subtle">{formatDate(item.createdAt, locale)}</time>
          </div>
          {item.comment ? <p className="text-sm leading-relaxed text-fg-muted">{item.comment}</p> : null}
          <p className="text-xs text-fg-subtle">{item.listingTitle}</p>
        </li>
      ))}
    </ul>
  );
}

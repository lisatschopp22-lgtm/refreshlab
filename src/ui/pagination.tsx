import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./cn";

export function Pagination({
  page,
  pageCount,
  hrefFor,
  labels,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
  labels: { previous: string; next: string; page: string; of: string };
}) {
  if (pageCount <= 1) return null;
  const item = "inline-flex h-9 items-center gap-1 rounded-[var(--radius-md)] border border-border px-3 text-sm";
  return (
    <nav className="flex items-center justify-between gap-3 pt-2" aria-label="Pagination">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(item, "text-fg hover:bg-bg-subtle")} rel="prev">
          <ChevronLeft className="size-4" /> {labels.previous}
        </Link>
      ) : (
        <span className={cn(item, "opacity-40")}>
          <ChevronLeft className="size-4" /> {labels.previous}
        </span>
      )}
      <span className="text-sm text-fg-muted">
        {labels.page} {page} {labels.of} {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={cn(item, "text-fg hover:bg-bg-subtle")} rel="next">
          {labels.next} <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(item, "opacity-40")}>
          {labels.next} <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}

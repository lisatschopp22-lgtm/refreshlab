import Link from "next/link";
import { cn } from "./cn";

export type TabItem = { href: string; label: string; count?: number; active?: boolean };

/** Link-driven tabs so tab state lives in the URL and stays server-rendered. */
export function Tabs({ items, className }: { items: TabItem[]; className?: string }) {
  return (
    <nav className={cn("flex gap-1 overflow-x-auto border-b border-border", className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
            item.active
              ? "border-[var(--primary)] text-fg"
              : "border-transparent text-fg-muted hover:border-border-strong hover:text-fg",
          )}
        >
          {item.label}
          {typeof item.count === "number" ? (
            <span className="ml-1.5 rounded-[var(--radius-full)] bg-bg-sunken px-1.5 py-0.5 text-xs text-fg-subtle">
              {item.count}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

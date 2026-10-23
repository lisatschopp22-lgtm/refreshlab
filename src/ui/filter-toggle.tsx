"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { cn } from "./cn";

/**
 * On a phone the filters fold away behind one button, so the results are not
 * pushed below a long list; on a wide screen they always show. The filters
 * are rendered on the server either way.
 */
export function FilterToggle({
  label,
  active,
  children,
}: {
  label: string;
  /** How many filters are on, shown on the button. */
  active: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="mb-3 flex w-full items-center justify-between rounded-[var(--radius-md)] border border-border bg-bg-elevated px-3 py-2 text-sm font-medium text-fg lg:hidden"
      >
        <span className="flex items-center gap-1.5">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {label}
          {active ? <span className="tabular text-xs text-fg-subtle">({active})</span> : null}
        </span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      <div className={cn(open ? "block" : "hidden", "lg:block")}>{children}</div>
    </>
  );
}

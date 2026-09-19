import type { ComponentProps } from "react";
import { cn } from "./cn";

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-bg-elevated">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "border-b border-border bg-bg-subtle px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      className={cn("border-b border-border px-3 py-[var(--row-py)] align-middle text-fg", className)}
      {...props}
    />
  );
}

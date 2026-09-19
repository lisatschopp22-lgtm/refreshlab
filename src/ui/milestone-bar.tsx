import { Check } from "lucide-react";
import { cn } from "./cn";

/** The five-step transaction bar from mockup S10. */
export function MilestoneBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
      {steps.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex items-center gap-1.5">
            {index > 0 ? <span className="mx-1 h-px w-4 bg-border-strong" aria-hidden="true" /> : null}
            <span
              className={cn(
                "tabular flex size-6 items-center justify-center rounded-full text-xs font-medium",
                active
                  ? "bg-primary text-primary-fg"
                  : done
                    ? "bg-success-subtle text-success"
                    : "bg-bg-sunken text-fg-subtle",
              )}
            >
              {done ? <Check className="size-3.5" aria-hidden="true" /> : step}
            </span>
            <span className={cn(active ? "font-medium text-fg" : "text-fg-muted")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

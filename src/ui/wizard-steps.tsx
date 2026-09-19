import { Check } from "lucide-react";
import { cn } from "./cn";

export function WizardSteps({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {steps.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex items-center gap-2">
            {index > 0 ? <span className="text-fg-subtle">·</span> : null}
            <span
              className={cn(
                "flex items-center gap-1.5",
                active ? "font-medium text-fg" : done ? "text-fg-muted" : "text-fg-subtle",
              )}
            >
              <span
                className={cn(
                  "tabular flex size-5 items-center justify-center rounded-full text-[0.6875rem]",
                  active
                    ? "bg-primary text-primary-fg"
                    : done
                      ? "bg-success-subtle text-success"
                      : "bg-bg-sunken text-fg-subtle",
                )}
              >
                {done ? <Check className="size-3" aria-hidden="true" /> : step}
              </span>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

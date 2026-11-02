import type { ReactNode } from "react";
import { Recycle } from "lucide-react";
import { Daylight } from "./daylight";

/** The bright head of a section page, with the opener's light and its recycling mark. */
export function PageHero({
  kicker,
  title,
  lead,
  top,
  children,
}: {
  kicker: string;
  title: string;
  lead: string;
  /** Above the kicker, such as breadcrumbs. */
  top?: ReactNode;
  /** Below the lead, such as a call to action. */
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-bg-elevated">
      <Daylight />
      <div className="relative mx-auto max-w-[1200px] px-4 pb-14 pt-6">
        {top}
        <div className="mt-6 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] bg-primary-subtle px-3 py-1 text-sm font-medium text-primary-subtle-fg">
            <Recycle className="size-4" aria-hidden="true" />
            {kicker}
          </span>
          <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-fg-muted">{lead}</p>
          {children ? <div className="mt-7 flex flex-wrap gap-3">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}

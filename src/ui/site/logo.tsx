import { cn } from "../cn";
import { LogoMark, markNames, type MarkName } from "./logo-marks";

/**
 * Logo lockups. The brand is undecided, so this is a set of proposals rather
 * than a single mark: pick one with the design switcher, or open two in two
 * tabs with ?logo=… and compare.
 *
 * Every variant inherits the active palette and typeface, so a logo is judged
 * in the design it will actually sit in.
 */

export const logoVariants = [
  // Typographic only
  "wordmark",
  "brackets",
  "lower",
  "mono",
  // Mark plus wordmark
  "instrument",
  "rotor",
  "flask",
  "spin",
  "hex",
  "tag",
  "bench",
  "sprout",
  "balance",
  "microscope",
  "magnifier",
  "molecule",
  "beaker",
  // Mark in a filled badge
  "badge",
] as const;
export type LogoVariant = (typeof logoVariants)[number];

export const defaultLogo: LogoVariant = "instrument";

/** Which mark a variant draws, if any. */
export function markFor(variant: LogoVariant): MarkName | null {
  if ((markNames as readonly string[]).includes(variant)) return variant as MarkName;
  if (variant === "badge") return "rotor";
  return null;
}

const sizes = {
  sm: { text: "text-base", mark: "size-5", gap: "gap-1.5" },
  md: { text: "text-lg", mark: "size-6", gap: "gap-2" },
  lg: { text: "text-2xl", mark: "size-8", gap: "gap-2.5" },
  xl: { text: "text-4xl", mark: "size-12", gap: "gap-3" },
} as const;
export type LogoSize = keyof typeof sizes;

function Wordmark({ variant, className }: { variant: LogoVariant; className?: string }) {
  if (variant === "brackets") {
    return (
      <span className={cn("font-semibold tracking-tight", className)}>
        <span className="text-fg">refresh</span>
        <span className="text-primary">[</span>
        <span className="text-fg">Lab</span>
        <span className="text-primary">]</span>
      </span>
    );
  }

  if (variant === "lower") {
    return (
      <span className={cn("font-medium lowercase tracking-[-0.03em]", className)}>
        <span className="text-fg">refresh</span>
        <span className="text-primary">lab</span>
      </span>
    );
  }

  if (variant === "mono") {
    return (
      <span className={cn("tabular font-medium uppercase tracking-[0.14em]", className)}>
        <span className="text-fg">refresh</span>
        <span className="text-primary">·lab</span>
      </span>
    );
  }

  return (
    <span className={cn("font-bold tracking-tight", className)}>
      <span className="text-fg">refresh</span>
      <span className="text-primary">Lab</span>
    </span>
  );
}

export function Logo({
  variant = defaultLogo,
  size = "md",
  className,
  showText = true,
}: {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  showText?: boolean;
}) {
  const scale = sizes[size];
  const mark = markFor(variant);

  return (
    <span className={cn("inline-flex items-center", scale.gap, className)}>
      {mark ? (
        variant === "badge" ? (
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-[var(--radius-md)] bg-primary p-1 text-primary-fg",
              scale.mark,
            )}
          >
            <LogoMark name={mark} />
          </span>
        ) : (
          <span className={cn("inline-flex text-primary", scale.mark)}>
            <LogoMark name={mark} />
          </span>
        )
      ) : null}
      {showText ? <Wordmark variant={variant} className={scale.text} /> : null}
    </span>
  );
}

/** Mark above wordmark, for a square space such as an app tile. */
export function LogoStacked({
  variant = defaultLogo,
  className,
}: {
  variant?: LogoVariant;
  className?: string;
}) {
  const mark = markFor(variant);
  return (
    <span className={cn("inline-flex flex-col items-center gap-2", className)}>
      {mark ? (
        <span className="inline-flex size-10 text-primary">
          <LogoMark name={mark} />
        </span>
      ) : null}
      <Wordmark variant={variant} className="text-lg" />
    </span>
  );
}

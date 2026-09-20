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
  "pipette",
  // Mark reversed out of a filled tile
  "badge",
  "pipette-badge",
] as const;
export type LogoVariant = (typeof logoVariants)[number];

export const defaultLogo: LogoVariant = "instrument";

/** Which mark a variant draws, if any. */
export function markFor(variant: LogoVariant): MarkName | null {
  if ((markNames as readonly string[]).includes(variant)) return variant as MarkName;
  if (variant === "badge") return "rotor";
  if (variant === "pipette-badge") return "pipette";
  return null;
}

/** Tile variants reverse the mark out of a filled rounded rectangle. */
export function isBadge(variant: LogoVariant) {
  return variant === "badge" || variant === "pipette-badge";
}

/**
 * A mark is sized by height and lets its width follow, so the wide bench scene
 * is not squashed into the same square as a flask.
 */
const sizes = {
  sm: { text: "text-base", mark: "h-5", tile: "h-7 p-1.5", gap: "gap-1.5" },
  md: { text: "text-lg", mark: "h-6", tile: "h-8 p-1.5", gap: "gap-2" },
  lg: { text: "text-2xl", mark: "h-8", tile: "h-11 p-2", gap: "gap-2.5" },
  xl: { text: "text-4xl", mark: "h-12", tile: "h-16 p-2.5", gap: "gap-3" },
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
        isBadge(variant) ? (
          // The tile is filled and the figure is knocked out of it, so the
          // colour surrounds the subject rather than forming it.
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-[var(--radius-lg)] bg-primary text-primary-fg",
              scale.tile,
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
        isBadge(variant) ? (
          <span className="inline-flex h-12 items-center justify-center rounded-[var(--radius-lg)] bg-primary p-2 text-primary-fg">
            <LogoMark name={mark} />
          </span>
        ) : (
          <span className="inline-flex h-10 text-primary">
            <LogoMark name={mark} />
          </span>
        )
      ) : null}
      <Wordmark variant={variant} className="text-lg" />
    </span>
  );
}

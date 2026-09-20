import { cn } from "../cn";

/**
 * Logo marks. All are drawn on a 24 × 24 grid with a 1.8 stroke so they stay
 * legible at favicon size, and all use currentColor so a mark inherits
 * whichever palette is active.
 */

export const markNames = [
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
] as const;
export type MarkName = (typeof markNames)[number];

type MarkProps = { className?: string; title?: string };

/**
 * Most marks are a single object and sit on a 24 × 24 grid. The bench scene is
 * a figure beside a rack, which is genuinely wider; squeezing it into a square
 * distorts it. Marks therefore share a height of 24 and declare their own
 * width, and are laid out by height so proportions survive.
 */
export const markViewBox: Record<MarkName, string> = {
  instrument: "0 0 24 24",
  rotor: "0 0 24 24",
  flask: "0 0 24 24",
  spin: "0 0 24 24",
  hex: "0 0 24 24",
  tag: "0 0 24 24",
  bench: "0 0 24 24",
  sprout: "0 0 24 24",
  balance: "0 0 24 24",
  microscope: "0 0 24 24",
  magnifier: "0 0 24 24",
  molecule: "0 0 24 24",
  beaker: "0 0 24 24",
  pipette: "0 0 26 24",
};

/** Width ÷ height, for laying a mark out beside the wordmark. */
export const markAspect: Record<MarkName, number> = Object.fromEntries(
  (Object.entries(markViewBox) as [MarkName, string][]).map(([name, box]) => {
    const [, , width, height] = box.split(" ").map(Number);
    return [name, width! / height!];
  }),
) as Record<MarkName, number>;

const svg = "h-full w-auto";
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** The benchtop instrument from the reference photograph, reduced to four parts. */
function Instrument({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn(svg, className)} aria-hidden="true">
      <rect x="2.1" y="6.2" width="19.8" height="13.6" rx="2.6" {...stroke} />
      <rect x="5" y="9.1" width="8.4" height="5.6" rx="1.1" {...stroke} />
      <circle cx="18" cy="11.9" r="1.9" {...stroke} />
      <path d="M5 17.6h8.4" {...stroke} />
    </svg>
  );
}

/** A centrifuge rotor from above. The copy already says "a second spin". */
function Rotor({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn(svg, className)} aria-hidden="true">
      <circle cx="12" cy="12" r="9.1" {...stroke} />
      <circle cx="12" cy="12" r="2.4" {...stroke} />
      <rect x="10.4" y="2.7" width="3.2" height="4.2" rx="1.2" {...stroke} />
      <rect x="10.4" y="17.1" width="3.2" height="4.2" rx="1.2" {...stroke} />
      <rect x="2.7" y="10.4" width="4.2" height="3.2" rx="1.2" {...stroke} />
      <rect x="17.1" y="10.4" width="4.2" height="3.2" rx="1.2" {...stroke} />
    </svg>
  );
}

/** A conical flask with rising bubbles: the equipment, still in use. */
function Flask({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn(svg, className)} aria-hidden="true">
      <path d="M9.4 2.9h5.2" {...stroke} />
      <path d="M10.1 2.9v6.3L4.4 18.4a2 2 0 0 0 1.7 3h11.8a2 2 0 0 0 1.7-3l-5.7-9.2V2.9" {...stroke} />
      <path d="M6.9 14.6h10.2" {...stroke} />
      <circle cx="10.2" cy="17.6" r="1.15" {...stroke} />
      <circle cx="14.3" cy="18.4" r="0.85" {...stroke} />
    </svg>
  );
}

/** A refresh arc: the second life, with nothing else in the way. */
function Spin({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn(svg, className)} aria-hidden="true">
      <path d="M20.4 12a8.4 8.4 0 1 1-2.9-6.35" {...stroke} />
      <path d="M18.1 1.9v4.1h-4.1" {...stroke} />
      <circle cx="12" cy="12" r="2.6" {...stroke} />
    </svg>
  );
}

/** A hexagon with a cycle inside: chemistry plus reuse. */
function Hex({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn(svg, className)} aria-hidden="true">
      <path d="M12 2.2 20.6 7v10L12 21.8 3.4 17V7Z" {...stroke} />
      <path d="M16 12a4 4 0 1 1-1.5-3.1" {...stroke} />
      <path d="M15.1 5.9v3h-3" {...stroke} />
    </svg>
  );
}

/** An asset tag: every instrument here carries a record and a history. */
function Tag({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn(svg, className)} aria-hidden="true">
      <path d="M11.3 2.6h7.3a2.5 2.5 0 0 1 2.5 2.5v7.3a2.5 2.5 0 0 1-.73 1.77l-6.7 6.7a2.5 2.5 0 0 1-3.54 0l-7.3-7.3a2.5 2.5 0 0 1 0-3.54l6.7-6.7a2.5 2.5 0 0 1 1.77-.73Z" {...stroke} />
      <circle cx="16.8" cy="7.2" r="1.9" {...stroke} />
      <path d="M8.2 12.1l3.7 3.7" {...stroke} />
    </svg>
  );
}

/** The whole reference scene: instruments standing on a bench. */
function Bench({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn(svg, className)} aria-hidden="true">
      <rect x="2.2" y="8.4" width="8.2" height="9.4" rx="1.8" {...stroke} />
      <path d="M4.6 11.3h3.4" {...stroke} />
      <path d="M15.4 5.4h3.1" {...stroke} />
      <path d="M15.9 5.4v4.1l-2.7 5.4a1.7 1.7 0 0 0 1.5 2.9h4.6a1.7 1.7 0 0 0 1.5-2.9L18 9.5V5.4" {...stroke} />
      <path d="M1.6 21h20.8" {...stroke} />
    </svg>
  );
}

/** A sprout in a test tube: the second life, stated as plainly as possible. */
function Sprout({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn(svg, className)} aria-hidden="true">
      <path d="M8.6 10.1h6.8" {...stroke} />
      <path d="M9.3 10.1v8.1a2.7 2.7 0 0 0 5.4 0v-8.1" {...stroke} />
      <path d="M12 10.1V5.2" {...stroke} />
      <path d="M12 7.3c-.2-2 -1.7-3.4-3.6-3.5-.1 2 1.4 3.5 3.6 3.5Z" {...stroke} />
      <path d="M12 5.9c.2-1.8 1.6-3 3.4-3.1.1 1.8-1.3 3.1-3.4 3.1Z" {...stroke} />
    </svg>
  );
}

/** A balance: what an instrument is actually worth. */
function Balance({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn(svg, className)} aria-hidden="true">
      <path d="M12 4.6v15" {...stroke} />
      <circle cx="12" cy="3.2" r="1.4" {...stroke} />
      <path d="M8.2 20.4h7.6" {...stroke} />
      <path d="M4.4 7.6h15.2" {...stroke} />
      <path d="M1.9 13.2a2.5 2.5 0 0 0 5 0Z" {...stroke} />
      <path d="M17.1 13.2a2.5 2.5 0 0 0 5 0Z" {...stroke} />
      <path d="M4.4 7.6 2.6 12.4M19.6 7.6l1.8 4.8" {...stroke} />
    </svg>
  );
}

/** A microscope: the inspection that turns a claim into a finding. */
function Microscope({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn(svg, className)} aria-hidden="true">
      <path d="M14.3 2.9 17 5.6" {...stroke} />
      <path d="M9.8 8.6 14 4.4a1.9 1.9 0 0 1 2.7 2.7l-4.2 4.2Z" {...stroke} />
      <path d="M9.6 11.7 12 14.1" {...stroke} />
      <path d="M6.6 16.3h7.6" {...stroke} />
      <path d="M8.4 16.3v4.5" {...stroke} />
      <path d="M4.3 20.8h13.4" {...stroke} />
    </svg>
  );
}

/** A magnifier with bubbles in the lens: find it, then look closely. */
function Magnifier({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn(svg, className)} aria-hidden="true">
      <circle cx="10.4" cy="10.4" r="7.3" {...stroke} />
      <path d="M15.7 15.7 21 21" {...stroke} />
      <circle cx="9" cy="11.4" r="1.5" {...stroke} />
      <circle cx="12.9" cy="9.2" r="1" {...stroke} />
    </svg>
  );
}

/** A molecule: labs connected to each other rather than to a dealer. */
function Molecule({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn(svg, className)} aria-hidden="true">
      <path d="M10.7 7.4 6.4 14.8M13.3 7.4l4.3 7.4M7.7 17.2h8.6" {...stroke} />
      <circle cx="12" cy="5.2" r="2.5" {...stroke} />
      <circle cx="5.1" cy="17.2" r="2.5" {...stroke} />
      <circle cx="18.9" cy="17.2" r="2.5" {...stroke} />
    </svg>
  );
}

/** A graduated beaker: the most ordinary object in any laboratory. */
function Beaker({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn(svg, className)} aria-hidden="true">
      <path d="M6.3 3.3h11.4" {...stroke} />
      <path d="M7.5 3.3v14.9a2.8 2.8 0 0 0 2.8 2.8h3.4a2.8 2.8 0 0 0 2.8-2.8V3.3" {...stroke} />
      <path d="M16.5 7.4h-2.3M16.5 10.7h-2.3" {...stroke} />
      <path d="M7.5 14.3h9" {...stroke} />
    </svg>
  );
}

/**
 * The scientist at the bench, from the silhouette sheet: head and shoulders, a
 * forearm holding a pipette, two tubes in a rack. Drawn as a solid silhouette
 * rather than a line, both because the reference is one and because a
 * silhouette is what reverses cleanly out of a filled tile.
 */
function Pipette({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 26 24" className={cn(svg, className)} aria-hidden="true">
      <g fill="currentColor">
        {/* head with a bob */}
        <path d="M7.6 1.9a3.3 3.3 0 0 1 3.3 3.3v2.7a1.1 1.1 0 0 1-1.1 1.1H5.4a1.1 1.1 0 0 1-1.1-1.1V5.2a3.3 3.3 0 0 1 3.3-3.3Z" />
        {/* neck */}
        <path d="M6.5 8.4h2.3v3.6H6.5z" />
        {/* shoulders and torso */}
        <path d="M1.8 23v-5.5a5.8 5.8 0 0 1 11.6 0V23z" />
        {/* pipette: plunger, barrel, tapered tip */}
        <rect x="16.2" y="3.8" width="2.4" height="1.9" rx="0.6" />
        <path d="M16.3 6a.7.7 0 0 1 .7-.7h.8a.7.7 0 0 1 .7.7v6.8h-2.2z" />
        <path d="M16.6 12.7h1.6l-.45 3h-.7z" />
        {/* two tubes in a rack, the left one under the pipette */}
        <path d="M16.1 16.6h2.6v3.7a1.3 1.3 0 0 1-2.6 0z" />
        <path d="M19.9 16.6h2.6v3.7a1.3 1.3 0 0 1-2.6 0z" />
        <rect x="15" y="21.4" width="8.6" height="1.5" rx="0.7" />
      </g>
      {/* forearm, leaving the shoulder and angling down to the pipette */}
      <path
        d="M11.7 12.3 16.4 13.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

const marks: Record<MarkName, (props: MarkProps) => React.ReactElement> = {
  instrument: Instrument,
  rotor: Rotor,
  flask: Flask,
  spin: Spin,
  hex: Hex,
  tag: Tag,
  bench: Bench,
  sprout: Sprout,
  balance: Balance,
  microscope: Microscope,
  magnifier: Magnifier,
  molecule: Molecule,
  beaker: Beaker,
  pipette: Pipette,
};

export function LogoMark({
  name,
  className,
}: {
  name: MarkName;
  className?: string;
}) {
  const Component = marks[name];
  return (
    <span data-mark={name} className="contents">
      <Component className={className} />
    </span>
  );
}

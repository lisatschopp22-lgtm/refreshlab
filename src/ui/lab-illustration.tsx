import { cn } from "./cn";

/**
 * A bright lab bench drawn in the palette's own colours, ringed by a cycle of
 * three arrows: an instrument's second life. Drawn rather than photographed,
 * so it follows every theme and depends on nobody else's pictures.
 */

const CX = 300;
const CY = 192;
const R = 168;

const point = (degrees: number, radius = R) => {
  const a = (degrees * Math.PI) / 180;
  return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) };
};

/** One clockwise arc of the cycle, ending in an arrowhead along its direction. */
function CycleArrow({ from, to }: { from: number; to: number }) {
  const start = point(from);
  const end = point(to);
  const a = (to * Math.PI) / 180;
  // Clockwise on screen: the tangent turns a quarter ahead of the radius.
  const tangent = { x: -Math.sin(a), y: Math.cos(a) };
  const normal = { x: Math.cos(a), y: Math.sin(a) };
  const tip = { x: end.x + tangent.x * 14, y: end.y + tangent.y * 14 };
  const left = { x: end.x + normal.x * 9, y: end.y + normal.y * 9 };
  const right = { x: end.x - normal.x * 9, y: end.y - normal.y * 9 };
  const f = (n: number) => n.toFixed(1);

  return (
    <>
      <path
        d={`M${f(start.x)} ${f(start.y)} A${R} ${R} 0 0 1 ${f(end.x)} ${f(end.y)}`}
        className="fill-none stroke-primary"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <path
        d={`M${f(left.x)} ${f(left.y)} L${f(tip.x)} ${f(tip.y)} L${f(right.x)} ${f(right.y)} Z`}
        className="fill-primary"
      />
    </>
  );
}

export function LabIllustration({ title, className }: { title: string; className?: string }) {
  return (
    <svg viewBox="0 0 600 400" role="img" aria-label={title} className={cn("h-auto w-full", className)}>
      <title>{title}</title>

      {/* Light behind the scene */}
      <circle cx={CX} cy={CY} r={150} className="fill-primary-subtle" />
      <circle cx={CX + 70} cy={CY - 70} r={46} className="fill-bg-elevated" opacity={0.7} />

      {/* The cycle */}
      <CycleArrow from={-75} to={15} />
      <CycleArrow from={45} to={135} />
      <CycleArrow from={165} to={255} />

      {/* Window with daylight */}
      <g className="stroke-border-strong" strokeWidth={2.5}>
        <rect x={168} y={70} width={92} height={84} rx={8} className="fill-bg-elevated" />
        <line x1={214} y1={70} x2={214} y2={154} />
        <line x1={168} y1={112} x2={260} y2={112} />
      </g>
      <g className="stroke-warning" strokeWidth={2} strokeLinecap="round" opacity={0.7}>
        <line x1={186} y1={84} x2={196} y2={94} />
        <line x1={228} y1={84} x2={238} y2={94} />
        <line x1={186} y1={126} x2={196} y2={136} />
      </g>

      {/* Bench */}
      <g className="stroke-border-strong" strokeWidth={2.5}>
        <rect x={150} y={276} width={300} height={14} rx={4} className="fill-bg-elevated" />
        <rect x={168} y={290} width={10} height={52} rx={2} className="fill-bg-subtle" />
        <rect x={422} y={290} width={10} height={52} rx={2} className="fill-bg-subtle" />
        <rect x={190} y={294} width={86} height={48} rx={5} className="fill-bg-elevated" />
        <line x1={222} y1={318} x2={244} y2={318} strokeLinecap="round" />
      </g>

      {/* Plant: things grow again */}
      <g>
        <path d="M166 276 L170 254 L192 254 L196 276 Z" className="fill-bg-subtle stroke-border-strong" strokeWidth={2.5} />
        <path d="M181 254 C176 236 164 230 154 232 C160 244 168 252 181 254 Z" className="fill-success-subtle stroke-success" strokeWidth={2} />
        <path d="M181 254 C184 232 196 222 210 222 C206 238 196 250 181 254 Z" className="fill-success-subtle stroke-success" strokeWidth={2} />
        <path d="M181 254 C180 240 182 228 186 218" className="fill-none stroke-success" strokeWidth={2} />
      </g>

      {/* Glassware */}
      <g className="stroke-fg-muted" strokeWidth={2.5} strokeLinejoin="round">
        <path d="M212 276 L226 240 L226 216 L238 216 L238 240 L252 276 Z" className="fill-bg-elevated" />
        <path d="M216 266 L221 254 L243 254 L248 266 L252 276 L212 276 Z" className="fill-accent-subtle" strokeWidth={0} />
        <path d="M212 276 L226 240 L226 216 L238 216 L238 240 L252 276 Z" className="fill-none" />
        <rect x={258} y={238} width={28} height={38} rx={3} className="fill-bg-elevated" />
        <rect x={259.5} y={256} width={25} height={18.5} rx={2} className="fill-primary-subtle" strokeWidth={0} />
      </g>

      {/* Centrifuge with its second-life tag */}
      <g>
        <rect x={296} y={214} width={104} height={62} rx={14} className="fill-bg-elevated stroke-primary" strokeWidth={3} />
        <path d="M306 214 C312 196 384 196 390 214" className="fill-bg-elevated stroke-primary" strokeWidth={3} />
        <rect x={310} y={234} width={36} height={16} rx={3} className="fill-primary-subtle" />
        <circle cx={376} cy={242} r={8} className="fill-none stroke-primary" strokeWidth={2.5} />
        <line x1={376} y1={242} x2={376} y2={236} className="stroke-primary" strokeWidth={2.5} strokeLinecap="round" />
        <line x1={392} y1={226} x2={414} y2={206} className="stroke-fg-subtle" strokeWidth={1.5} />
        <rect x={406} y={184} width={30} height={28} rx={7} className="fill-primary" />
        {/* A small loop on the tag: this unit is on its next round. */}
        <path
          d="M414 201 a7 7 0 1 1 14 -2 M428 199 l2.5 -4 M428 199 l-4.5 -1"
          className="fill-none stroke-primary-fg"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </g>

      {/* Microscope */}
      <g className="stroke-fg-muted" strokeLinecap="round" strokeLinejoin="round">
        <rect x={408} y={264} width={40} height={12} rx={3} className="fill-bg-elevated" strokeWidth={2.5} />
        <path d="M436 264 L436 214 Q436 204 426 200" className="fill-none" strokeWidth={7} />
        <rect x={412} y={234} width={30} height={6} rx={2} className="fill-bg-elevated" strokeWidth={2.5} />
        <path d="M424 200 L414 222" className="fill-none" strokeWidth={9} />
        <path d="M428 196 L436 182" className="fill-none" strokeWidth={6} />
      </g>
    </svg>
  );
}

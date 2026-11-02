import { Recycle } from "lucide-react";

/**
 * The opener's light: a soft glow of the brand colour from the top, fading
 * into the page, and a large recycling mark turning slowly behind it (still
 * when the system asks for less motion). Shared by the opener and the home
 * hero so the two always look the same. Place it first inside a `relative
 * overflow-hidden` element and give the content after it `relative`.
 */
export function Daylight() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(ellipse_at_top,var(--primary-subtle),transparent_70%)]"
      />
      <Recycle
        aria-hidden="true"
        strokeWidth={0.6}
        className="pointer-events-none absolute -right-40 -top-32 size-[38rem] text-primary opacity-[0.07] motion-safe:animate-[spin_180s_linear_infinite]"
      />
    </>
  );
}

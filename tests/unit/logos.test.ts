import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { logos } from "@/ui/design-prefs";
import { logoVariants, markFor, defaultLogo } from "@/ui/site/logo";
import { markNames } from "@/ui/site/logo-marks";

describe("logo variants", () => {
  it("keeps the switcher list and the component list in step", () => {
    // The switcher offers what the component can actually render; if these
    // drift, a chosen variant silently falls back to the default.
    expect([...logos].sort()).toEqual([...logoVariants].sort());
  });

  it("resolves every variant to a mark or to type alone", () => {
    for (const variant of logoVariants) {
      const mark = markFor(variant);
      if (mark !== null) expect(markNames).toContain(mark);
    }
  });

  it("offers at least four typographic variants with no mark", () => {
    const typeOnly = logoVariants.filter((variant) => markFor(variant) === null);
    expect(typeOnly.length).toBeGreaterThanOrEqual(4);
  });

  it("draws every mark that exists", () => {
    // A mark nobody can select is dead code.
    const used = new Set(logoVariants.map(markFor).filter(Boolean));
    for (const name of markNames) expect(used).toContain(name);
  });

  it("defaults to a variant that exists", () => {
    expect(logoVariants).toContain(defaultLogo);
  });

  it("draws each mark on the same 24-unit grid", () => {
    // Mixed viewBoxes make marks look different sizes beside each other.
    const source = readFileSync("src/ui/site/logo-marks.tsx", "utf8");
    const boxes = [...source.matchAll(/viewBox="([^"]+)"/g)].map((match) => match[1]);
    expect(boxes.length).toBe(markNames.length);
    expect(new Set(boxes)).toEqual(new Set(["0 0 24 24"]));
  });
});

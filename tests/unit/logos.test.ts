import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { logos } from "@/ui/design-prefs";
import { logoVariants, markFor, defaultLogo } from "@/ui/site/logo";
import { markNames, markViewBox } from "@/ui/site/logo-marks";

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

  it("draws every mark at the same height, whatever its width", () => {
    // A shared height is what makes marks look the same size beside each
    // other; a shared width would squash anything that is not square.
    const source = readFileSync("src/ui/site/logo-marks.tsx", "utf8");
    const drawn = [...source.matchAll(/<svg viewBox="([^"]+)"/g)].map((match) => match[1]!);
    expect(drawn.length).toBe(markNames.length);

    for (const box of drawn) {
      const [minX, minY, width, height] = box.split(" ").map(Number);
      expect([minX, minY]).toEqual([0, 0]);
      expect(height).toBe(24);
      expect(width).toBeGreaterThanOrEqual(24);
      expect(width).toBeLessThanOrEqual(40);
    }
  });

  it("declares a viewBox for every mark it draws", () => {
    const source = readFileSync("src/ui/site/logo-marks.tsx", "utf8");
    const drawn = [...source.matchAll(/<svg viewBox="([^"]+)"/g)].map((match) => match[1]!);
    for (const name of markNames) {
      expect(markViewBox[name], name).toBeTruthy();
      expect(drawn, name).toContain(markViewBox[name]);
    }
  });
});

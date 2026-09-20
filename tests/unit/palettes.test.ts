import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { paletteInk, palettes } from "@/ui/design-prefs";

/**
 * The switcher draws each swatch from `paletteInk`, while the page itself is
 * coloured by the definitions in tokens.css. If the two drift apart, the dot
 * stops showing the palette it selects, which is silent and confusing.
 */
const css = readFileSync("src/ui/tokens.css", "utf8");

function definitionFor(palette: string) {
  const match = css.match(new RegExp(`\\[data-palette="${palette}"\\][^{]*\\{([^}]*)\\}`));
  if (!match) return null;
  const body = match[1]!;
  const hue = body.match(/--hue:\s*([\d.]+)/);
  const chroma = body.match(/--chroma:\s*([\d.]+)/);
  return hue && chroma ? { hue: Number(hue[1]), chroma: Number(chroma[1]) } : null;
}

describe("palettes", () => {
  it("defines every palette in the stylesheet", () => {
    for (const palette of palettes) {
      expect(definitionFor(palette), `[data-palette="${palette}"] in tokens.css`).toBeTruthy();
    }
  });

  it("matches the hue and chroma the switcher previews", () => {
    for (const palette of palettes) {
      expect(definitionFor(palette), palette).toEqual(paletteInk[palette]);
    }
  });

  it("offers a genuinely different hue in each direction", () => {
    const hues = palettes.map((palette) => paletteInk[palette].hue).sort((a, b) => a - b);
    const distinct = new Set(hues);
    expect(distinct.size).toBe(hues.length);
    expect(palettes.length).toBeGreaterThanOrEqual(10);
  });

  it("includes a near-neutral option, because no brand colour is a valid answer", () => {
    expect(paletteInk.slate.chroma).toBeLessThan(0.04);
    expect(paletteInk.ink.chroma).toBeLessThan(0.01);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultPrefs, parsePrefs, prefsToDataset, serialisePrefs, themes } from "@/ui/design-prefs";

describe("design preferences", () => {
  it("defaults to a warm paper theme, which sets its own data-theme", () => {
    expect(defaultPrefs.theme).toBe("sand");
    expect(prefsToDataset(defaultPrefs)["data-theme"]).toBe("sand");
  });

  it("defines every paper tone in the stylesheet", () => {
    const css = readFileSync("src/ui/tokens.css", "utf8");
    for (const theme of ["cream", "vanilla", "linen", "sand", "greige", "latte"] as const) {
      expect(themes).toContain(theme);
      expect(css, theme).toMatch(new RegExp(`:root\\[data-theme="${theme}"\\]\\s*\\{[^}]*--paper-l:`));
    }
  });

  it("leaves data-theme unset for system, so the stylesheet follows the operating system", () => {
    expect(prefsToDataset({ ...defaultPrefs, theme: "system" })["data-theme"]).toBeUndefined();
  });

  // A stored default would freeze it: changing the default later would never
  // reach anyone who had visited before.
  it("stores only what differs from the defaults", () => {
    expect(serialisePrefs(defaultPrefs)).toBe("");
    expect(serialisePrefs({ ...defaultPrefs, palette: "plum", theme: "dark" })).toBe("palette:plum,theme:dark");
  });

  it("reads back what it stored", () => {
    const chosen = { ...defaultPrefs, palette: "plum" as const, radius: "round" as const };
    expect(parsePrefs(serialisePrefs(chosen))).toEqual(chosen);
    expect(parsePrefs("")).toEqual(defaultPrefs);
  });
});

export const palettes = ["botanical", "clinical", "ember", "graphite"] as const;
export type Palette = (typeof palettes)[number];
export const themes = ["system", "light", "dark"] as const;
export type Theme = (typeof themes)[number];
export const fonts = ["inter", "plex"] as const;
export type Font = (typeof fonts)[number];
export const densities = ["comfortable", "compact"] as const;
export type Density = (typeof densities)[number];

export type DesignPrefs = { palette: Palette; theme: Theme; font: Font; density: Density };

export const defaultPrefs: DesignPrefs = {
  // Deliberately not green: the brand colour is an open question, so the code
  // must not quietly pick one. Any palette is one click away.
  palette: "botanical",
  theme: "system",
  font: "inter",
  density: "comfortable",
};

export const COOKIE = "rl-design";

export function parsePrefs(raw: string | undefined): DesignPrefs {
  if (!raw) return defaultPrefs;
  const parts = Object.fromEntries(
    raw.split(",").map((pair) => pair.split(":") as [string, string]),
  );
  return {
    palette: (palettes as readonly string[]).includes(parts.palette ?? "")
      ? (parts.palette as Palette)
      : defaultPrefs.palette,
    theme: (themes as readonly string[]).includes(parts.theme ?? "")
      ? (parts.theme as Theme)
      : defaultPrefs.theme,
    font: (fonts as readonly string[]).includes(parts.font ?? "")
      ? (parts.font as Font)
      : defaultPrefs.font,
    density: (densities as readonly string[]).includes(parts.density ?? "")
      ? (parts.density as Density)
      : defaultPrefs.density,
  };
}

export function serialisePrefs(prefs: DesignPrefs) {
  return `palette:${prefs.palette},theme:${prefs.theme},font:${prefs.font},density:${prefs.density}`;
}

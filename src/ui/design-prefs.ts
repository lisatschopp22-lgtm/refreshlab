/**
 * The brand is undecided, so every visual decision is a runtime switch rather
 * than a constant. Each dimension here has a matching block in tokens.css.
 */

export const palettes = [
  "botanical",
  "moss",
  "clinical",
  "ocean",
  "aqua",
  "ember",
  "copper",
  "crimson",
  "plum",
  "graphite",
  "slate",
  "ink",
] as const;
export type Palette = (typeof palettes)[number];

/**
 * Hue and chroma per palette, mirroring tokens.css. Kept here so the switcher
 * can render a real swatch of each one; `npm run check` fails if the two
 * drift apart.
 */
export const paletteInk: Record<Palette, { hue: number; chroma: number }> = {
  botanical: { hue: 150, chroma: 0.12 },
  moss: { hue: 138, chroma: 0.075 },
  clinical: { hue: 244, chroma: 0.115 },
  ocean: { hue: 205, chroma: 0.105 },
  aqua: { hue: 195, chroma: 0.12 },
  ember: { hue: 52, chroma: 0.135 },
  copper: { hue: 38, chroma: 0.11 },
  crimson: { hue: 22, chroma: 0.14 },
  plum: { hue: 330, chroma: 0.11 },
  graphite: { hue: 286, chroma: 0.095 },
  slate: { hue: 240, chroma: 0.028 },
  ink: { hue: 0, chroma: 0.004 },
};

export const themes = ["system", "light", "dark"] as const;
export type Theme = (typeof themes)[number];

export const fonts = ["inter", "plex", "grotesk", "serif", "system"] as const;
export type Font = (typeof fonts)[number];

export const densities = ["compact", "comfortable", "roomy"] as const;
export type Density = (typeof densities)[number];

export const radii = ["sharp", "soft", "round"] as const;
export type Radius = (typeof radii)[number];

export const depths = ["flat", "raised", "lifted"] as const;
export type Depth = (typeof depths)[number];

export const contrasts = ["normal", "high"] as const;
export type Contrast = (typeof contrasts)[number];

/**
 * Logo lockups. Mirrors `logoVariants` in ui/site/logo.tsx; a unit test fails
 * if the two lists drift apart.
 */
export const logos = [
  "wordmark",
  "brackets",
  "lower",
  "mono",
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
  "badge",
] as const;
export type Logo = (typeof logos)[number];

export type DesignPrefs = {
  palette: Palette;
  theme: Theme;
  font: Font;
  density: Density;
  radius: Radius;
  depth: Depth;
  contrast: Contrast;
  logo: Logo;
};

export const defaultPrefs: DesignPrefs = {
  // Deliberately not a decision: any palette is one click away.
  palette: "botanical",
  theme: "system",
  font: "inter",
  density: "comfortable",
  radius: "soft",
  depth: "raised",
  contrast: "normal",
  // The direction the reference photograph pointed at. One click to any other.
  logo: "instrument",
};

/** Every switchable dimension, in the order the panel shows them. */
export const dimensions = {
  palette: palettes,
  theme: themes,
  font: fonts,
  density: densities,
  radius: radii,
  depth: depths,
  contrast: contrasts,
  logo: logos,
} as const satisfies Record<keyof DesignPrefs, readonly string[]>;

export const COOKIE = "rl-design";

function pick<K extends keyof DesignPrefs>(
  key: K,
  value: string | undefined,
): DesignPrefs[K] {
  const allowed = dimensions[key] as readonly string[];
  return (value && allowed.includes(value) ? value : defaultPrefs[key]) as DesignPrefs[K];
}

export function parsePrefs(raw: string | undefined): DesignPrefs {
  if (!raw) return defaultPrefs;
  const parts = Object.fromEntries(
    raw.split(",").map((pair) => pair.split(":") as [string, string]),
  );
  return {
    palette: pick("palette", parts.palette),
    theme: pick("theme", parts.theme),
    font: pick("font", parts.font),
    density: pick("density", parts.density),
    radius: pick("radius", parts.radius),
    depth: pick("depth", parts.depth),
    contrast: pick("contrast", parts.contrast),
    logo: pick("logo", parts.logo),
  };
}

export function serialisePrefs(prefs: DesignPrefs) {
  return (Object.keys(dimensions) as (keyof DesignPrefs)[])
    .map((key) => `${key}:${prefs[key]}`)
    .join(",");
}

/** The data-* attributes tokens.css selects on. */
export function prefsToDataset(prefs: DesignPrefs): Record<string, string> {
  const dataset: Record<string, string> = {
    "data-palette": prefs.palette,
    "data-font": prefs.font,
    "data-density": prefs.density,
    "data-radius": prefs.radius,
    "data-depth": prefs.depth,
    "data-contrast": prefs.contrast,
    // Not a stylesheet selector: the header reads it to pick a component.
    "data-logo": prefs.logo,
  };
  if (prefs.theme !== "system") dataset["data-theme"] = prefs.theme;
  return dataset;
}

/** A shareable link that reproduces exactly this combination. */
export function prefsToQuery(prefs: DesignPrefs) {
  const params = new URLSearchParams();
  for (const key of Object.keys(dimensions) as (keyof DesignPrefs)[]) {
    params.set(key, prefs[key]);
  }
  return params.toString();
}

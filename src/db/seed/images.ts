import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "../env";

/**
 * The prototype has no photographs. Rather than grey boxes, it generates a
 * technical placeholder per model so search results, galleries and cards can
 * be judged with something that has shape, colour and text.
 */

export type Variant = "front" | "detail" | "plate";

const silhouettes: Record<string, (hue: number) => string> = {
  centrifuge: () => `
    <ellipse cx="400" cy="330" rx="185" ry="140" class="body"/>
    <ellipse cx="400" cy="300" rx="185" ry="140" class="body2"/>
    <ellipse cx="400" cy="296" rx="120" ry="88" class="hole"/>
    <g class="rotor"><circle cx="400" cy="296" r="70" class="line"/>
      <line x1="400" y1="226" x2="400" y2="366" class="line"/>
      <line x1="330" y1="296" x2="470" y2="296" class="line"/>
      <circle cx="400" cy="296" r="14" class="dot"/></g>
    <rect x="250" y="400" width="120" height="44" rx="8" class="panel"/>`,
  chromatography: () => `
    <rect x="230" y="150" width="340" height="70" rx="6" class="body"/>
    <rect x="230" y="235" width="340" height="70" rx="6" class="body2"/>
    <rect x="230" y="320" width="340" height="70" rx="6" class="body"/>
    <rect x="230" y="405" width="340" height="70" rx="6" class="body2"/>
    <circle cx="272" cy="185" r="12" class="dot"/><circle cx="272" cy="270" r="12" class="dot"/>
    <rect x="420" y="425" width="120" height="30" rx="4" class="panel"/>
    <path d="M300 460 q40 -30 80 0 t80 0" class="line" fill="none"/>`,
  microscope: () => `
    <rect x="300" y="430" width="200" height="40" rx="10" class="body"/>
    <path d="M380 430 L380 300 q0 -40 40 -40 l30 0" class="body2" fill="none" stroke-width="26"/>
    <rect x="430" y="240" width="46" height="90" rx="8" class="body"/>
    <circle cx="453" cy="205" r="34" class="hole"/>
    <rect x="335" y="360" width="150" height="14" rx="4" class="panel"/>
    <line x1="453" y1="340" x2="453" y2="360" class="line"/>`,
  spectrometer: () => `
    <rect x="215" y="215" width="370" height="230" rx="14" class="body"/>
    <rect x="245" y="245" width="150" height="110" rx="6" class="hole"/>
    <path d="M255 330 l30 -40 l25 25 l30 -55 l30 70" class="line" fill="none"/>
    <circle cx="500" cy="280" r="28" class="dot"/>
    <rect x="430" y="340" width="130" height="16" rx="4" class="panel"/>
    <rect x="430" y="370" width="90" height="16" rx="4" class="panel"/>`,
  pcr: () => `
    <rect x="230" y="230" width="340" height="220" rx="16" class="body"/>
    <rect x="270" y="280" width="200" height="120" rx="6" class="hole"/>
    ${Array.from({ length: 24 }, (_, i) => {
      const cx = 290 + (i % 8) * 25;
      const cy = 300 + Math.floor(i / 8) * 35;
      return `<circle cx="${cx}" cy="${cy}" r="8" class="well"/>`;
    }).join("")}
    <rect x="490" y="280" width="56" height="90" rx="6" class="panel"/>`,
  freezer: () => `
    <rect x="265" y="130" width="270" height="360" rx="12" class="body"/>
    <rect x="285" y="155" width="230" height="140" rx="6" class="body2"/>
    <rect x="285" y="315" width="230" height="150" rx="6" class="body2"/>
    <rect x="300" y="215" width="80" height="12" rx="6" class="panel"/>
    <rect x="300" y="382" width="80" height="12" rx="6" class="panel"/>
    <rect x="420" y="100" width="100" height="26" rx="6" class="panel"/>
    <text x="470" y="119" class="mini" text-anchor="middle">-86 °C</text>`,
  incubator: () => `
    <rect x="255" y="145" width="290" height="330" rx="12" class="body"/>
    <rect x="285" y="185" width="230" height="255" rx="6" class="hole"/>
    <line x1="285" y1="270" x2="515" y2="270" class="line"/>
    <line x1="285" y1="355" x2="515" y2="355" class="line"/>
    <rect x="285" y="150" width="230" height="24" rx="4" class="panel"/>
    <circle cx="505" cy="310" r="9" class="dot"/>`,
  balance: () => `
    <rect x="240" y="330" width="320" height="110" rx="12" class="body"/>
    <rect x="300" y="180" width="200" height="150" rx="6" class="body2"/>
    <ellipse cx="400" cy="325" rx="82" ry="18" class="hole"/>
    <rect x="270" y="365" width="140" height="42" rx="6" class="panel"/>
    <text x="340" y="394" class="mini" text-anchor="middle">0.0001 g</text>`,
  pipette: () => `
    <path d="M395 130 l30 0 l14 90 l-8 150 l-42 0 l-8 -150 z" class="body"/>
    <rect x="385" y="110" width="50" height="30" rx="8" class="body2"/>
    <path d="M389 370 l32 0 l-8 100 l-16 0 z" class="hole"/>
    <rect x="360" y="230" width="100" height="26" rx="4" class="panel"/>
    <circle cx="410" cy="170" r="10" class="dot"/>`,
  autoclave: () => `
    <rect x="235" y="180" width="330" height="280" rx="16" class="body"/>
    <circle cx="400" cy="315" r="105" class="hole"/>
    <circle cx="400" cy="315" r="80" class="line"/>
    <rect x="255" y="200" width="60" height="18" rx="4" class="panel"/>
    <circle cx="520" cy="220" r="16" class="dot"/>`,
  cabinet: () => `
    <rect x="195" y="170" width="410" height="250" rx="10" class="body"/>
    <rect x="225" y="205" width="350" height="150" rx="4" class="hole"/>
    <rect x="195" y="420" width="410" height="26" rx="4" class="body2"/>
    <line x1="225" y1="290" x2="575" y2="290" class="line"/>
    <path d="M260 230 l0 40 M320 230 l0 40 M380 230 l0 40 M440 230 l0 40 M500 230 l0 40" class="line"/>
    <rect x="225" y="175" width="120" height="20" rx="4" class="panel"/>`,
  evaporator: () => `
    <path d="M330 150 l140 0 l0 40 l-60 30 l0 90 l60 0" class="line" fill="none" stroke-width="10"/>
    <circle cx="330" cy="380" r="72" class="body"/>
    <rect x="455" y="170" width="70" height="230" rx="10" class="body2"/>
    <rect x="290" y="450" width="230" height="34" rx="8" class="panel"/>
    <circle cx="490" cy="285" r="18" class="dot"/>`,
};

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] as string,
  );
}

export function placeholderSvg(options: {
  icon: string;
  hue: number;
  manufacturer: string;
  model: string;
  categoryLabel: string;
  variant: Variant;
  reference?: string;
}) {
  const { icon, hue, manufacturer, model, categoryLabel, variant, reference } = options;
  const draw = silhouettes[icon] ?? silhouettes.centrifuge!;
  const isPlate = variant === "plate";
  const zoom = variant === "detail" ? ' transform="translate(-180,-130) scale(1.45)"' : "";

  const body = isPlate
    ? `<rect x="190" y="180" width="420" height="260" rx="10" class="body2"/>
       <rect x="215" y="205" width="370" height="210" rx="4" class="hole"/>
       <text x="240" y="250" class="plate">${escapeXml(manufacturer.toUpperCase())}</text>
       <text x="240" y="292" class="plate-lg">${escapeXml(model)}</text>
       <text x="240" y="330" class="plate-sm">SER. ${reference ?? "RL-000000"}</text>
       <text x="240" y="358" class="plate-sm">230 V ~ 50 Hz</text>
       <text x="240" y="386" class="plate-sm">MADE FOR LABORATORY USE</text>`
    : `<g${zoom}>${draw(hue)}</g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" role="img" aria-label="${escapeXml(`${manufacturer} ${model}`)}">
  <defs>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M32 0 L0 0 0 32" fill="none" stroke="oklch(0.88 0.01 ${hue})" stroke-width="1"/>
    </pattern>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="oklch(0.985 0.012 ${hue})"/>
      <stop offset="100%" stop-color="oklch(0.93 0.03 ${hue})"/>
    </linearGradient>
  </defs>
  <style>
    .body { fill: oklch(0.55 0.09 ${hue}); }
    .body2 { fill: oklch(0.63 0.075 ${hue}); }
    .hole { fill: oklch(0.32 0.05 ${hue}); }
    .well { fill: oklch(0.42 0.06 ${hue}); }
    .panel { fill: oklch(0.86 0.035 ${hue}); }
    .dot { fill: oklch(0.72 0.14 ${(hue + 60) % 360}); }
    .line { stroke: oklch(0.88 0.02 ${hue}); stroke-width: 4; fill: none; stroke-linecap: round; }
    .rotor .line { stroke-width: 3; }
    text { font-family: ui-monospace, "SF Mono", Menlo, monospace; }
    .label { font-size: 21px; fill: oklch(0.36 0.04 ${hue}); letter-spacing: 0.04em; }
    .sub { font-size: 15px; fill: oklch(0.5 0.03 ${hue}); letter-spacing: 0.12em; }
    .mini { font-size: 13px; fill: oklch(0.34 0.03 ${hue}); }
    .plate { font-size: 19px; fill: oklch(0.9 0.02 ${hue}); letter-spacing: 0.22em; }
    .plate-lg { font-size: 30px; fill: oklch(0.96 0.02 ${hue}); }
    .plate-sm { font-size: 15px; fill: oklch(0.78 0.02 ${hue}); letter-spacing: 0.08em; }
  </style>
  <rect width="800" height="600" fill="url(#bg)"/>
  <rect width="800" height="600" fill="url(#grid)"/>
  ${body}
  <text x="48" y="524" class="sub">${escapeXml(categoryLabel.toUpperCase())} · ${variant.toUpperCase()}</text>
  <text x="48" y="556" class="label">${escapeXml(`${manufacturer} ${model}`)}</text>
</svg>`;
}

export function storageClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Removes a folder through the Storage API. Deleting from storage.objects
 * directly is rejected by Supabase, so re-seeding has to go through the API.
 */
export async function clearStorageFolder(bucket: string, folder: string) {
  const supabase = storageClient();
  const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 1000 });
  if (error || !data?.length) return 0;

  const paths = data.map((entry) => `${folder}/${entry.name}`);
  await supabase.storage.from(bucket).remove(paths);
  return paths.length;
}

export async function uploadSvg(path: string, svg: string) {
  const supabase = storageClient();
  const { error } = await supabase.storage
    .from("images")
    .upload(path, new Blob([svg], { type: "image/svg+xml" }), {
      contentType: "image/svg+xml",
      upsert: true,
    });
  if (error) throw new Error(`upload ${path}: ${error.message}`);
  return path;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Copy, Palette as PaletteIcon, RotateCcw, Shuffle, X } from "lucide-react";
import {
  COOKIE,
  defaultPrefs,
  dimensions,
  paletteInk,
  palettes,
  prefsToQuery,
  serialisePrefs,
  type DesignPrefs,
} from "./design-prefs";
import { cn } from "./cn";

const keys = Object.keys(dimensions) as (keyof DesignPrefs)[];

/**
 * Prototype-only control. The brand colour, typeface, shape and density are all
 * still open questions, so every screen has to be viewable in any combination
 * without a rebuild.
 *
 * Precedence: a click beats a query parameter, which beats the cookie.
 */
export function DesignSwitcher({
  initial,
  labels,
}: {
  initial: DesignPrefs;
  labels: Record<string, string>;
}) {
  const searchParams = useSearchParams();
  const [chosen, setChosen] = useState<Partial<DesignPrefs>>({});
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const fromUrl = useMemo(() => {
    const out: Partial<DesignPrefs> = {};
    for (const key of keys) {
      const value = searchParams.get(key);
      if (value) (out as Record<string, string>)[key] = value;
    }
    return out;
  }, [searchParams]);

  const prefs: DesignPrefs = { ...initial, ...fromUrl, ...chosen };
  const { palette, theme, font, density, radius, depth, contrast } = prefs;

  // Writing to the document element and the cookie is an external system,
  // which is what an effect is for.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.palette = palette;
    root.dataset.font = font;
    root.dataset.density = density;
    root.dataset.radius = radius;
    root.dataset.depth = depth;
    root.dataset.contrast = contrast;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;

    const value = serialisePrefs({ palette, theme, font, density, radius, depth, contrast });
    document.cookie = `${COOKIE}=${value};path=/;max-age=31536000;samesite=lax`;
  }, [palette, theme, font, density, radius, depth, contrast]);

  const set = <K extends keyof DesignPrefs>(key: K, value: DesignPrefs[K]) =>
    setChosen((current) => ({ ...current, [key]: value }));

  const shuffle = () => {
    const next: Partial<DesignPrefs> = {};
    for (const key of keys) {
      const options = dimensions[key] as readonly string[];
      (next as Record<string, string>)[key] = options[Math.floor(Math.random() * options.length)]!;
    }
    // Leave the light/dark choice alone: shuffling it is disorienting rather
    // than informative.
    next.theme = theme;
    setChosen(next);
  };

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?${prefsToQuery(prefs)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be refused; the panel simply does not confirm.
    }
  };

  const chips = (key: keyof DesignPrefs, label: string) => (
    <div className="space-y-1" key={key}>
      <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-fg-subtle">{label}</p>
      <div className="flex flex-wrap gap-1">
        {(dimensions[key] as readonly string[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => set(key, value as DesignPrefs[typeof key])}
            aria-pressed={prefs[key] === value}
            className={cn(
              "rounded-[var(--radius-sm)] border px-2 py-1 text-xs capitalize transition-colors",
              prefs[key] === value
                ? "border-[var(--primary)] bg-primary-subtle text-primary-subtle-fg"
                : "border-border text-fg-muted hover:bg-bg-subtle",
            )}
          >
            {labels[value] ?? value}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed bottom-4 right-4 z-40 print:hidden">
      {open ? (
        <div className="flex max-h-[min(80vh,42rem)] w-72 flex-col rounded-[var(--radius-lg)] border border-border bg-bg-elevated shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <p className="text-sm font-semibold">{labels.title}</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={shuffle}
                title={labels.shuffle}
                aria-label={labels.shuffle}
                className="rounded-[var(--radius-sm)] p-1 text-fg-subtle hover:bg-bg-subtle hover:text-fg"
              >
                <Shuffle className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setChosen(defaultPrefs)}
                title={labels.reset}
                aria-label={labels.reset}
                className="rounded-[var(--radius-sm)] p-1 text-fg-subtle hover:bg-bg-subtle hover:text-fg"
              >
                <RotateCcw className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={copyLink}
                title={labels.copyLink}
                aria-label={labels.copyLink}
                className="rounded-[var(--radius-sm)] p-1 text-fg-subtle hover:bg-bg-subtle hover:text-fg"
              >
                {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={labels.close}
                className="rounded-[var(--radius-sm)] p-1 text-fg-subtle hover:bg-bg-subtle hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3.5 overflow-y-auto px-3 py-3">
            <div className="space-y-1.5">
              <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-fg-subtle">
                {labels.palette}
              </p>
              {/* A custom property resolves at the element that declares it,
                  so a nested data-palette cannot re-derive the ramp. The dot
                  is computed from the same hue and chroma the stylesheet uses;
                  a unit test fails if the two drift apart. */}
              <div className="grid grid-cols-6 gap-1.5">
                {palettes.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set("palette", value)}
                    title={labels[value] ?? value}
                    aria-label={labels[value] ?? value}
                    aria-pressed={palette === value}
                    className={cn(
                      "relative flex aspect-square items-center justify-center rounded-[var(--radius-sm)] border transition-transform",
                      palette === value
                        ? "border-[var(--fg)] scale-105"
                        : "border-border hover:scale-105",
                    )}
                    style={{
                      background: `oklch(0.6 ${paletteInk[value].chroma} ${paletteInk[value].hue})`,
                    }}
                  >
                    {palette === value ? <Check className="size-3.5 text-[var(--neutral-0)]" /> : null}
                  </button>
                ))}
              </div>
              <p className="text-[0.6875rem] capitalize text-fg-subtle">
                {labels[palette] ?? palette}
              </p>
            </div>

            {chips("theme", labels.theme!)}
            {chips("font", labels.font!)}
            {chips("radius", labels.radius!)}
            {chips("depth", labels.depth!)}
            {chips("density", labels.density!)}
            {chips("contrast", labels.contrast!)}
          </div>

          <p className="border-t border-border px-3 py-2 text-[0.6875rem] leading-snug text-fg-subtle">
            {labels.hint}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={labels.title}
          className="flex size-10 items-center justify-center rounded-full border border-border bg-bg-elevated text-fg-muted shadow-[var(--shadow-md)] hover:text-fg"
        >
          <PaletteIcon className="size-4" />
        </button>
      )}
    </div>
  );
}

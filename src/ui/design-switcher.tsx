"use client";

import { useEffect, useState } from "react";
import { Palette as PaletteIcon, X } from "lucide-react";
import {
  COOKIE,
  densities,
  fonts,
  palettes,
  serialisePrefs,
  themes,
  type DesignPrefs,
} from "./design-prefs";
import { cn } from "./cn";

/**
 * Prototype-only control. Design decisions are still open, so every screen has
 * to be viewable in any palette, theme, typeface and density without a rebuild.
 */
export function DesignSwitcher({ initial, labels }: { initial: DesignPrefs; labels: Record<string, string> }) {
  const [prefs, setPrefs] = useState(initial);
  const [open, setOpen] = useState(false);

  // ?palette=ember&theme=dark on any URL applies and persists.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = { ...prefs };
    let changed = false;
    for (const key of ["palette", "theme", "font", "density"] as const) {
      const value = params.get(key);
      if (value && value !== next[key]) {
        (next as Record<string, string>)[key] = value;
        changed = true;
      }
    }
    if (changed) setPrefs(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.palette = prefs.palette;
    root.dataset.font = prefs.font;
    root.dataset.density = prefs.density;
    if (prefs.theme === "system") delete root.dataset.theme;
    else root.dataset.theme = prefs.theme;
    document.cookie = `${COOKIE}=${serialisePrefs(prefs)};path=/;max-age=31536000;samesite=lax`;
  }, [prefs]);

  const group = (
    name: keyof DesignPrefs,
    values: readonly string[],
    label: string,
  ) => (
    <div className="space-y-1">
      <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-fg-subtle">{label}</p>
      <div className="flex flex-wrap gap-1">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setPrefs((p) => ({ ...p, [name]: value }))}
            className={cn(
              "rounded-[var(--radius-sm)] border px-2 py-1 text-xs capitalize transition-colors",
              prefs[name] === value
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
        <div className="w-60 space-y-3 rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-3 shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{labels.title}</p>
            <button type="button" onClick={() => setOpen(false)} aria-label={labels.close}>
              <X className="size-4 text-fg-subtle hover:text-fg" />
            </button>
          </div>
          {group("palette", palettes, labels.palette!)}
          {group("theme", themes, labels.theme!)}
          {group("font", fonts, labels.font!)}
          {group("density", densities, labels.density!)}
          <p className="text-[0.6875rem] leading-snug text-fg-subtle">{labels.hint}</p>
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

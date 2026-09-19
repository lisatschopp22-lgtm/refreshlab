"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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

const keys = ["palette", "theme", "font", "density"] as const;

/**
 * Prototype-only control. Design decisions are still open, so every screen has
 * to be viewable in any palette, theme, typeface and density without a rebuild.
 * Precedence: a click beats ?palette=… in the URL, which beats the cookie.
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

  const fromUrl = useMemo(() => {
    const out: Partial<DesignPrefs> = {};
    for (const key of keys) {
      const value = searchParams.get(key);
      if (value) (out as Record<string, string>)[key] = value;
    }
    return out;
  }, [searchParams]);

  const prefs: DesignPrefs = { ...initial, ...fromUrl, ...chosen };
  const { palette, theme, font, density } = prefs;

  // Writing to the document element and the cookie is an external system,
  // which is what an effect is for.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.palette = palette;
    root.dataset.font = font;
    root.dataset.density = density;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
    document.cookie = `${COOKIE}=${serialisePrefs({ palette, theme, font, density })};path=/;max-age=31536000;samesite=lax`;
  }, [palette, theme, font, density]);

  const group = (name: keyof DesignPrefs, values: readonly string[], label: string) => (
    <div className="space-y-1">
      <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-fg-subtle">{label}</p>
      <div className="flex flex-wrap gap-1">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setChosen((current) => ({ ...current, [name]: value }))}
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

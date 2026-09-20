import { existsSync, readFileSync } from "node:fs";

const MANIFEST = "supabase/reference-images.json";

export type ReferenceImage = {
  category: string | null;
  title: string;
  path: string;
  source: string;
  page: string;
  licence: string;
  author: string;
};

type Manifest = { source: string; count: number; images: ReferenceImage[] };

/**
 * Photographs fetched by `npm run images:fetch`. Absent on a fresh clone, in
 * which case the seed falls back to the generated placeholders, so nothing
 * here depends on someone else's pictures being present.
 */
export function loadReferenceImages(): {
  source: string;
  all: ReferenceImage[];
  byCategory: Map<string, ReferenceImage[]>;
} | null {
  if (!existsSync(MANIFEST)) return null;

  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as Manifest;
  if (!manifest.images?.length) return null;

  const byCategory = new Map<string, ReferenceImage[]>();
  for (const image of manifest.images) {
    if (!image.category) continue;
    const list = byCategory.get(image.category) ?? [];
    list.push(image);
    byCategory.set(image.category, list);
  }

  return { source: manifest.source, all: manifest.images, byCategory };
}

/**
 * Picks deterministically, so re-seeding gives the same catalogue and a
 * screenshot taken yesterday still matches. Falls back to the whole pool when
 * a category has no photographs of its own.
 */
export function pickImages(
  pool: { all: ReferenceImage[]; byCategory: Map<string, ReferenceImage[]> },
  categorySlug: string,
  offset: number,
  count: number,
): ReferenceImage[] {
  const candidates = pool.byCategory.get(categorySlug)?.length
    ? pool.byCategory.get(categorySlug)!
    : pool.all;

  return Array.from({ length: count }, (_, index) => {
    return candidates[(offset + index) % candidates.length]!;
  });
}

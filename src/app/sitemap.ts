import type { MetadataRoute } from "next";
import { allPublicSlugs } from "@/db/queries/catalogue";
import { db } from "@/db/client";
import { contentPages } from "@/db/schema/operations";
import { eq } from "drizzle-orm";
import { locales } from "@/i18n/routing";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** One entry per public URL per locale, with hreflang alternates. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, pages] = await Promise.all([
    allPublicSlugs(),
    db.select({ slug: contentPages.slug, updatedAt: contentPages.updatedAt })
      .from(contentPages)
      .where(eq(contentPages.published, true)),
  ]);

  const entry = (path: string, lastModified: Date, priority: number): MetadataRoute.Sitemap[number][] =>
    locales.map((locale) => ({
      url: `${siteUrl}/${locale}${path}`,
      lastModified,
      priority,
      changeFrequency: "weekly" as const,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}${path}`])),
      },
    }));

  return [
    ...entry("", new Date(), 1),
    ...entry("/suche", new Date(), 0.5),
    ...entry("/qualifizierte-geraete", new Date(), 0.8),
    ...entry("/ersatzteillager", new Date(), 0.8),
    ...entry("/katalog", new Date(), 0.8),
    ...slugs.categories.flatMap((c) => entry(`/kategorie/${c.slug}`, c.updatedAt, 0.8)),
    ...slugs.manufacturers.flatMap((m) => entry(`/hersteller/${m.slug}`, m.updatedAt, 0.6)),
    ...slugs.models.flatMap((m) => entry(`/modell/${m.slug}`, m.updatedAt, 0.7)),
    ...slugs.listings.flatMap((l) => entry(`/geraete/${l.slug}`, l.updatedAt, 0.9)),
    ...pages.flatMap((p) => entry(`/p/${p.slug}`, p.updatedAt, 0.4)),
  ].flat();
}

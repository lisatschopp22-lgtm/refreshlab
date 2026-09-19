import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Which crawlers may index public catalogue data is a commercial decision, not
 * a technical one, so the policy is explicit rather than a bare wildcard.
 * Search engines and the documented AI crawlers may read public pages; the
 * account, admin and checkout areas are closed to everyone.
 */
const privateAreas = [
  "/api/",
  "/de/konto",
  "/en/konto",
  "/de/admin",
  "/en/admin",
  "/de/verkaufen",
  "/en/verkaufen",
  "/de/nachrichten",
  "/en/nachrichten",
  "/de/kaufen",
  "/en/kaufen",
  "/de/bestellung",
  "/en/bestellung",
  "/de/design",
  "/en/design",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privateAreas },
      // Named explicitly so the decision is visible and revocable per crawler.
      { userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"], allow: "/", disallow: privateAreas },
      { userAgent: "*", disallow: ["/*?*sort=", "/*?*seite=", "/*?*ansicht="] },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

import { NextResponse } from "next/server";
import { searchProvider } from "@/integrations/search";
import { storageUrl } from "@/ui/storage-image";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Documented catalogue feed. The requirements call for public data that search
 * engines and agents can read without scraping HTML. Paged, public listings
 * only, no personal data.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("perPage") ?? 50) || 50));

  const result = await searchProvider().search({
    q: url.searchParams.get("q") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    manufacturer: url.searchParams.get("manufacturer") ?? undefined,
    page,
    perPage,
    sort: "newest",
  });

  return NextResponse.json(
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "refreshLab listings",
      license: `${siteUrl}/de/p/agb`,
      generatedAt: new Date().toISOString(),
      page,
      perPage,
      total: result.total,
      next:
        page * perPage < result.total
          ? `${siteUrl}/api/feed/listings?page=${page + 1}&perPage=${perPage}`
          : null,
      itemListElement: result.items.map((item, index) => ({
        "@type": "ListItem",
        position: (page - 1) * perPage + index + 1,
        item: {
          "@type": "Product",
          sku: item.reference,
          name: item.title,
          brand: item.manufacturerName,
          model: item.modelName,
          category: item.categorySlug,
          productionDate: item.year ? String(item.year) : undefined,
          itemCondition: item.condition,
          image: storageUrl(item.imagePath) ?? undefined,
          url: `${siteUrl}/de/geraete/${item.slug}`,
          offers: {
            "@type": "Offer",
            price: (item.priceCents / 100).toFixed(2),
            priceCurrency: item.currency,
            availability: "https://schema.org/InStock",
            areaServed: item.locationCountry,
            seller: item.organisationName ?? item.sellerName,
          },
          additionalProperty: [
            { name: "verified", value: Boolean(item.verifiedAt) },
            { name: "inspected", value: Boolean(item.inspectedAt) },
            { name: "warrantyMonths", value: item.warrantyMonths },
            { name: "location", value: `${item.locationCity}, ${item.locationCountry}` },
          ],
        },
      })),
    },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}

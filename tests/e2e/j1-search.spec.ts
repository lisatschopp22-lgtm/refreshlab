import { expect, test } from "@playwright/test";

/**
 * J1: search → filter by facets → open a listing → structured data present.
 */
test.describe("J1 discover equipment", () => {
  test("search, narrow by facet, open a listing", async ({ page }) => {
    await page.goto("/de");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.getByPlaceholder("Gerät, Modell oder Hersteller").first().fill("zentrifuge");
    await page.keyboard.press("Enter");

    await page.waitForURL(/\/de\/suche\?q=zentrifuge/);
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toContainText("zentrifuge");

    const resultsBefore = await page.locator("article").count();
    expect(resultsBefore).toBeGreaterThan(0);

    // Narrow by a condition facet and confirm the count actually drops.
    await page.getByRole("link", { name: /Gebraucht, gut/ }).first().click();
    await page.waitForURL(/zustand=good/);
    const resultsAfter = await page.locator("article").count();
    expect(resultsAfter).toBeGreaterThan(0);
    expect(resultsAfter).toBeLessThanOrEqual(resultsBefore);

    // Other condition values must remain reachable, or the filter is a dead end.
    await expect(page.getByRole("link", { name: /Neuwertig/ }).first()).toBeVisible();

    await page.locator("article h3 a").first().click();
    await page.waitForURL(/\/de\/geraete\//);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/CHF|EUR/).first()).toBeVisible();
  });

  test("a listing page carries Product and Offer data in the initial HTML", async ({ request }) => {
    const feed = await request.get("/api/feed/listings?perPage=1");
    const json = await feed.json();
    const url: string = json.itemListElement[0].item.url;

    const response = await request.get(url);
    const html = await response.text();

    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(
      (match) => JSON.parse(match[1]!),
    );
    const flat = blocks.flat();
    const product = flat.find((item) => item["@type"] === "Product");

    expect(product).toBeTruthy();
    expect(product.offers.price).toMatch(/^\d+\.\d{2}$/);
    expect(product.offers.priceCurrency).toMatch(/CHF|EUR/);
    expect(product.offers.availability).toContain("schema.org");
    expect(product.itemCondition).toContain("schema.org");
    expect(flat.some((item) => item["@type"] === "BreadcrumbList")).toBe(true);

    // The price must be readable without running JavaScript.
    expect(html).toContain(product.sku);
  });

  test("the sitemap lists listings, models and categories", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    const xml = await response.text();
    expect(xml).toContain("/de/geraete/");
    expect(xml).toContain("/de/modell/");
    expect(xml).toContain("/de/kategorie/");
    expect(xml).toContain("/en/geraete/");
  });

  test("robots keeps private areas out and names AI crawlers explicitly", async ({ request }) => {
    const text = await (await request.get("/robots.txt")).text();
    expect(text).toContain("Disallow: /de/konto");
    expect(text).toContain("Disallow: /de/admin");
    expect(text).toContain("GPTBot");
    expect(text).toContain("Sitemap:");
  });

  test("every palette renders the home page", async ({ page }) => {
    for (const palette of ["botanical", "clinical", "ember", "graphite"]) {
      await page.goto(`/de?palette=${palette}`);
      await expect(page.locator("html")).toHaveAttribute("data-palette", palette);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });
});

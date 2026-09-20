import { expect, test, type Page } from "@playwright/test";
import { password, personas } from "./personas";

/**
 * Not assertions: this produces a picture of every key screen in every palette
 * so design directions can be compared side by side. Output lands in
 * `screenshots/`. Run it with: npx playwright test screenshots
 */

const palettes = [
  "botanical", "moss", "clinical", "ocean", "aqua", "ember",
  "copper", "crimson", "plum", "graphite", "slate", "ink",
] as const;
const themes = ["light", "dark"] as const;

/** Every palette on the pages that decide a direction, four on the rest. */
const detailPalettes = ["botanical", "clinical", "ember", "graphite"] as const;

/** Looks worth comparing beyond colour: shape, depth, typeface and density. */
const looks = [
  { name: "a-default", query: "" },
  { name: "b-sharp-flat", query: "radius=sharp&depth=flat" },
  { name: "c-round-lifted", query: "radius=round&depth=lifted" },
  { name: "d-serif-roomy", query: "font=serif&density=roomy" },
  { name: "e-grotesk", query: "font=grotesk" },
  { name: "f-plex-compact", query: "font=plex&density=compact" },
  { name: "g-high-contrast", query: "contrast=high" },
] as const;

async function signIn(page: Page, email: string) {
  await page.goto("/de/anmelden");
  await page.getByLabel("E-Mail", { exact: true }).first().fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await page.waitForURL(/\/de\/konto/);
}

async function shoot(page: Page, path: string, name: string, palette: string, theme: string) {
  const join = path.includes("?") ? "&" : "?";
  await page.goto(`${path}${join}palette=${palette}&theme=${theme}`);
  await page.waitForLoadState("networkidle").catch(() => {});
  // Hide the prototype-only switcher so it does not sit in every picture.
  await page.addStyleTag({ content: ".fixed.bottom-4.right-4 { display: none !important; }" });
  await page.screenshot({
    path: `screenshots/${palette}-${theme}/${name}.png`,
    fullPage: true,
  });
}

test.describe("design screenshots", () => {
  test.setTimeout(240_000);

  test("every palette on the home and design pages", async ({ page }) => {
    for (const palette of palettes) {
      for (const theme of themes) {
        await shoot(page, "/de", "01-home", palette, theme);
        await shoot(page, "/de/design", "05-design-system", palette, theme);
      }
    }
    expect(true).toBe(true);
  });

  test("the remaining public pages in four palettes", async ({ page }) => {
    const feed = await page.request.get("/api/feed/listings?perPage=1");
    const listingUrl = new URL((await feed.json()).itemListElement[0].item.url).pathname;

    for (const palette of detailPalettes) {
      for (const theme of themes) {
        await shoot(page, "/de/suche?q=zentrifuge", "02-search", palette, theme);
        await shoot(page, listingUrl, "03-listing", palette, theme);
        await shoot(page, "/de/katalog", "04-catalogue", palette, theme);
      }
    }
    expect(true).toBe(true);
  });

  /** The same page in every shape, depth, typeface and density. */
  test("looks beyond colour", async ({ page }) => {
    const feed = await page.request.get("/api/feed/listings?perPage=1");
    const listingUrl = new URL((await feed.json()).itemListElement[0].item.url).pathname;

    for (const look of looks) {
      for (const [path, name] of [
        ["/de", "01-home"],
        [listingUrl, "03-listing"],
      ] as const) {
        const join = path.includes("?") ? "&" : "?";
        const url = `${path}${join}palette=botanical&theme=light${look.query ? `&${look.query}` : ""}`;
        await page.goto(url);
        await page.waitForLoadState("networkidle").catch(() => {});
        await page.addStyleTag({ content: ".fixed.bottom-4.right-4 { display: none !important; }" });
        await page.screenshot({ path: `screenshots/looks/${look.name}-${name}.png`, fullPage: true });
      }
    }
    expect(true).toBe(true);
  });

  test("account and admin pages", async ({ page }) => {
    await signIn(page, personas.admin.email);
    for (const palette of detailPalettes) {
      await shoot(page, "/de/konto", "06-dashboard", palette, "light");
      await shoot(page, "/de/verkaufen", "07-sell-wizard", palette, "light");
      await shoot(page, "/de/admin", "08-admin-overview", palette, "dark");
      await shoot(page, "/de/admin/inserate", "09-admin-listings", palette, "dark");
      await shoot(page, "/de/admin/einstellungen", "10-admin-settings", palette, "dark");
    }
    expect(true).toBe(true);
  });

  test("mobile widths", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const feed = await page.request.get("/api/feed/listings?perPage=1");
    const listingUrl = new URL((await feed.json()).itemListElement[0].item.url).pathname;

    for (const path of [
      ["/de", "m-01-home"],
      ["/de/suche", "m-02-search"],
      [listingUrl, "m-03-listing"],
    ] as const) {
      await shoot(page, path[0], path[1], "botanical", "light");
    }
    expect(true).toBe(true);
  });
});

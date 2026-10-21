import { expect, test, type Page } from "@playwright/test";
import { password, personas } from "./personas";

async function signIn(page: Page, email: string) {
  await page.goto("/de/anmelden");
  await page.getByLabel("E-Mail", { exact: true }).first().fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await page.waitForURL(/\/de\/konto/);
}

/** Opens the first listing that offers a fixed-price purchase to this user. */
async function openBuyableListing(page: Page) {
  const feed = await page.request.get("/api/feed/listings?perPage=60");
  const items: { item: { url: string; name: string } }[] = (await feed.json()).itemListElement;
  for (const entry of items) {
    await page.goto(entry.item.url);
    const buyNow = page.getByRole("button", { name: "Kaufen" });
    if (await buyNow.isVisible().catch(() => false)) return { ...entry.item, buyNow };
  }
  throw new Error("no listing offers a fixed-price purchase");
}

/**
 * A live listing from a seller we can sign in as that still accepts offers.
 * These tests change state, so the first candidate is often already sold on a
 * repeat run; the helper keeps looking rather than skipping.
 */
async function openOfferableListing(page: Page, sellerName: string) {
  const feed = await page.request.get("/api/feed/listings?perPage=100");
  const items: { item: { url: string; name: string; offers: { seller: string; price: string } } }[] = (
    await feed.json()
  ).itemListElement;
  const candidates = items.filter((entry) => entry.item.offers.seller === sellerName);
  expect(candidates.length, `listings sold by ${sellerName}`).toBeGreaterThan(0);

  for (const entry of candidates) {
    await page.goto(entry.item.url);
    const offer = page.getByRole("link", { name: "Angebot machen" });
    if (await offer.isVisible().catch(() => false)) return { ...entry.item, offer };
  }
  throw new Error(`no live listing by ${sellerName} accepts offers`);
}

/**
 * J4: offer → seller counters → buyer accepts → pay → ship → confirm receipt →
 * payout released, with the invoice visible to both parties.
 */
test("an offer is negotiated, paid, shipped and completed", async ({ browser }) => {
  const buyerContext = await browser.newContext();
  const buyer = await buyerContext.newPage();
  await signIn(buyer, personas.buyer.email);

  const listing = await openOfferableListing(buyer, personas.seller.sellsAs);
  await listing.offer.click();
  await buyer.waitForURL(/\/angebot$/);

  const asking = Math.round(Number(listing.offers.price));
  const offered = Math.max(100, Math.round(asking * 0.8));
  await buyer.getByLabel(/Betrag/).fill(String(offered));
  await buyer.getByLabel("Nachricht an die verkaufende Person").fill("Budget ist leider begrenzt.");
  await buyer.getByRole("button", { name: "Angebot senden" }).click();
  await buyer.waitForURL(/\/konto\/angebote/);
  const buyerRow = () => buyer.locator("li").filter({ hasText: listing.name });
  await expect(buyerRow().first()).toContainText("Offen");

  // --- the seller counters
  const sellerContext = await browser.newContext();
  const seller = await sellerContext.newPage();
  await signIn(seller, personas.seller.email);
  await seller.goto("/de/konto/angebote");

  const incoming = seller.locator("li").filter({ hasText: listing.name }).first();
  await incoming.getByRole("button", { name: "Gegenangebot", exact: true }).click();
  const countered = Math.round((asking + offered) / 2);
  await incoming.getByLabel(/Gegenangebot in/).fill(String(countered));
  await incoming.getByRole("button", { name: "Gegenangebot senden" }).click();
  await expect(
    seller.locator("li").filter({ hasText: listing.name }).first(),
  ).toContainText("Gegenangebot", { timeout: 20_000 });

  // --- the buyer accepts the counter and pays
  await buyer.goto("/de/konto/angebote");
  const counterRow = buyerRow().filter({ hasText: "Gegenangebot" }).first();
  await counterRow.getByRole("button", { name: "Annehmen" }).click();
  await expect(buyerRow().filter({ hasText: "Angenommen" }).first()).toBeVisible({ timeout: 20_000 });

  await buyerRow()
    .filter({ hasText: "Angenommen" })
    .first()
    .getByRole("button", { name: /Angebot angenommen|bezahlen/i })
    .click();
  await buyer.waitForURL(/\/de\/kaufen\//, { timeout: 20_000 });

  // The buyer's share of the fee is part of the total before paying.
  await expect(buyer.getByText("Plattformgebühr Käufer")).toBeVisible();
  await buyer.getByRole("button", { name: "Zahlung verbindlich starten" }).click();
  await buyer.waitForURL(/\/kaufen\/.*\/zahlung/, { timeout: 20_000 });
  await buyer.getByRole("button", { name: "Zahlung erfolgreich" }).click();
  await buyer.waitForURL(/\/de\/bestellung\//, { timeout: 20_000 });
  await expect(buyer.getByText("Bezahlt").first()).toBeVisible();

  const orderUrl = buyer.url();

  // --- the seller ships
  await seller.goto(orderUrl);
  await seller.getByRole("button", { name: "Als versendet markieren" }).click();
  await seller.getByLabel("Sendungsnummer").fill("CH-9988-7766");
  await seller.getByRole("button", { name: "Als versendet markieren" }).click();
  await expect(seller.getByText("Versendet").first()).toBeVisible({ timeout: 20_000 });

  // --- the buyer confirms delivery, then receipt, which releases the payout
  await buyer.goto(orderUrl);
  await buyer.getByRole("button", { name: "Zugestellt" }).first().click();
  await expect(buyer.getByText("Zugestellt").first()).toBeVisible({ timeout: 20_000 });

  await buyer.getByRole("button", { name: "Empfang bestätigen" }).click();
  await expect(buyer.getByText("Abgeschlossen").first()).toBeVisible({ timeout: 20_000 });
  await expect(buyer.getByText("Auszahlung freigegeben")).toBeVisible();

  // --- the invoice separates fee from price for both parties
  await buyer.goto(`${orderUrl}/rechnung`);
  await expect(buyer.getByText("Plattformgebühr Käufer")).toBeVisible();
  await expect(buyer.getByText("Plattformgebühr Verkäufer")).toBeVisible();
  await expect(buyer.getByText("Auszahlung an Verkäufer")).toBeVisible();

  await seller.goto(`${orderUrl}/rechnung`);
  await expect(seller.getByText("Plattformgebühr Verkäufer")).toBeVisible();

  // --- the listing is now sold
  await buyer.goto(listing.url);
  await expect(buyer.getByText("Dieses Gerät ist verkauft.")).toBeVisible();

  await sellerContext.close();
  await buyerContext.close();
});

test("a failed payment leaves the transaction unpaid", async ({ page }) => {
  await signIn(page, personas.buyer.email);
  const listing = await openBuyableListing(page);
  await listing.buyNow.click();
  await page.waitForURL(/\/de\/kaufen\//, { timeout: 20_000 });

  await page.getByRole("button", { name: "Zahlung verbindlich starten" }).click();
  await page.waitForURL(/\/kaufen\/.*\/zahlung/);
  await page.getByRole("button", { name: "Zahlung fehlschlagen lassen" }).click();
  await page.waitForURL(/\/de\/bestellung\//, { timeout: 20_000 });

  await expect(page.getByText("Zahlung ausstehend").first()).toBeVisible();
  // The failure is on the record, not swallowed.
  await expect(page.getByText("payment.failed")).toBeVisible();
});

test("a buyer can raise a dispute after paying, and only an admin resolves it", async ({ browser }) => {
  const buyerContext = await browser.newContext();
  const buyer = await buyerContext.newPage();
  await signIn(buyer, personas.buyer.email);

  const listing = await openBuyableListing(buyer);
  await listing.buyNow.click();
  await buyer.waitForURL(/\/de\/kaufen\//, { timeout: 20_000 });
  await buyer.getByRole("button", { name: "Zahlung verbindlich starten" }).click();
  await buyer.waitForURL(/\/kaufen\/.*\/zahlung/);
  await buyer.getByRole("button", { name: "Zahlung erfolgreich" }).click();
  await buyer.waitForURL(/\/de\/bestellung\//, { timeout: 20_000 });
  const orderUrl = buyer.url();

  await buyer.getByRole("button", { name: "Beanstandung melden" }).click();
  await buyer.getByLabel("Was stimmt nicht?").fill("Der Rotor fehlt, obwohl er im Lieferumfang stand.");
  await buyer.getByRole("button", { name: "Beanstandung melden" }).click();
  await expect(buyer.getByText("Beanstandet").first()).toBeVisible({ timeout: 20_000 });

  // The buyer cannot resolve their own dispute.
  await expect(buyer.getByRole("button", { name: "Erstattet" })).toHaveCount(0);

  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await signIn(admin, personas.admin.email);
  await admin.goto(orderUrl);
  await expect(admin.getByRole("button", { name: "Erstattet" })).toBeVisible();

  await adminContext.close();
  await buyerContext.close();
});

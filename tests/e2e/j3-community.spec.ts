import { expect, test } from "@playwright/test";
import { password, personas } from "./personas";

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/de/anmelden");
  await page.getByLabel("E-Mail", { exact: true }).first().fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await page.waitForURL(/\/de\/konto/);
}

/** J3: ask the seller → seller replies → buyer sees the unread badge. */
test("a buyer and a seller exchange messages in two sessions", async ({ browser }) => {
  const stamp = Date.now();

  const buyerContext = await browser.newContext();
  const buyer = await buyerContext.newPage();
  await signIn(buyer, personas.buyer.email);

  // Find a listing owned by a persona we can sign in as.
  const feed = await buyer.request.get("/api/feed/listings?perPage=100");
  const items: { item: { url: string; offers: { seller: string } } }[] = (await feed.json())
    .itemListElement;
  const target = items.find((entry) => entry.item.offers.seller === personas.seller.name);
  expect(target, `a listing sold by ${personas.seller.name}`).toBeTruthy();

  await buyer.goto(target!.item.url);
  await buyer.getByRole("button", { name: "Verkäufer kontaktieren" }).click();
  await buyer.waitForURL(/\/de\/nachrichten\/[0-9a-f-]{36}/, { timeout: 20_000 });

  const question = `Ist der Rotor im Preis enthalten? (${stamp})`;
  await buyer.getByLabel("Nachricht schreiben").fill(question);
  await buyer.getByRole("button", { name: "Senden" }).click();
  await expect(buyer.getByText(question)).toBeVisible({ timeout: 20_000 });

  // --- the seller sees it as unread and answers
  const sellerContext = await browser.newContext();
  const seller = await sellerContext.newPage();
  await signIn(seller, personas.seller.email);
  await seller.goto("/de/nachrichten");

  const row = seller.locator("li").filter({ hasText: personas.buyer.name }).first();
  await expect(row).toContainText("ungelesen");
  await row.getByRole("link").first().click();
  await seller.waitForURL(/\/de\/nachrichten\/[0-9a-f-]{36}/);
  await expect(seller.getByText(question)).toBeVisible();

  const answer = `Ja, der TX-150 Rotor ist enthalten. (${stamp})`;
  await seller.getByLabel("Nachricht schreiben").fill(answer);
  await seller.getByRole("button", { name: "Senden" }).click();
  await expect(seller.getByText(answer)).toBeVisible({ timeout: 20_000 });

  // --- the buyer sees the reply, and the thread is now read for the seller
  await buyer.reload();
  await expect(buyer.getByText(answer)).toBeVisible({ timeout: 20_000 });

  await seller.goto("/de/nachrichten");
  await expect(
    seller.locator("li").filter({ hasText: personas.buyer.name }).first(),
  ).not.toContainText("ungelesen");

  // --- the notification reached the local mail server
  const mail = await buyer.request.get("http://127.0.0.1:54324/api/v1/messages?limit=50");
  const subjects: string[] = (await mail.json()).messages.map((m: { Subject: string }) => m.Subject);
  expect(subjects.some((subject) => subject.includes(personas.buyer.name))).toBe(true);

  await sellerContext.close();
  await buyerContext.close();
});

test("a seller cannot open a conversation with themselves", async ({ page }) => {
  await signIn(page, personas.seller.email);
  const feed = await page.request.get("/api/feed/listings?perPage=100");
  const items: { item: { url: string; offers: { seller: string } } }[] = (await feed.json())
    .itemListElement;
  const own = items.find((entry) => entry.item.offers.seller === personas.seller.name);

  await page.goto(own!.item.url);
  await page.getByRole("button", { name: "Verkäufer kontaktieren" }).click();
  await page.waitForURL(/\/de\/nachrichten/);
  expect(page.url()).toContain("error=self");
});

test("a signed-in user can post and report a comment on an equipment model", async ({ page }) => {
  const stamp = Date.now();
  await signIn(page, personas.buyer.email);

  const feed = await page.request.get("/api/feed/listings?perPage=1");
  const listingUrl: string = (await feed.json()).itemListElement[0].item.url;
  await page.goto(listingUrl);
  await page.getByRole("link", { name: /Über dieses Modell/ }).click();
  await page.waitForURL(/\/de\/modell\//);

  const body = `Läuft dieses Modell auch mit 230 V? (${stamp})`;
  await page.getByLabel("Frage oder Hinweis aus der Praxis").fill(body);
  await page.getByRole("button", { name: "Beitrag veröffentlichen" }).click();
  await expect(page.getByText(body)).toBeVisible({ timeout: 20_000 });

  // The author sees edit and delete, not a report link, on their own post.
  const own = page.locator("article").filter({ hasText: body }).first();
  await expect(own.getByRole("button", { name: "Löschen" })).toBeVisible();

  // Someone else's post can be reported.
  const other = page.locator("article").filter({ hasNotText: body }).first();
  await other.getByRole("button", { name: "Melden" }).click();
  await other.getByRole("button", { name: "Meldung senden" }).click();
  await expect(page.getByText("Danke, wir schauen uns das an.")).toBeVisible({ timeout: 20_000 });
});

test("a reply nests under its parent and stays one level deep", async ({ page }) => {
  await signIn(page, personas.buyer.email);
  const feed = await page.request.get("/api/feed/listings?perPage=1");
  const listingUrl: string = (await feed.json()).itemListElement[0].item.url;
  await page.goto(listingUrl);
  await page.getByRole("link", { name: /Über dieses Modell/ }).click();
  await page.waitForURL(/\/de\/modell\//);

  const parent = page.locator("article").first();
  await parent.getByRole("button", { name: "Antworten" }).click();

  const stamp = Date.now();
  const text = `Kann ich bestätigen. (${stamp})`;
  await parent.getByLabel("Antwort schreiben").fill(text);
  await parent.getByRole("button", { name: "Antwort senden" }).click();
  await expect(page.getByText(text)).toBeVisible({ timeout: 20_000 });

  // One level only: the reply is indented under its parent, not under itself.
  const reply = page.locator("li li").filter({ hasText: text });
  await expect(reply).toHaveCount(1);
  await expect(page.locator("li li li")).toHaveCount(0);
});

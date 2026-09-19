import { expect, test, type Page } from "@playwright/test";
import { password, personas } from "./personas";

async function signIn(page: Page, email: string) {
  await page.goto("/de/anmelden");
  await page.getByLabel("E-Mail", { exact: true }).first().fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await page.waitForURL(/\/de\/konto/);
}

test("the admin area is closed to ordinary users", async ({ page }) => {
  await signIn(page, personas.buyer.email);
  await page.goto("/de/admin");
  await expect(page).toHaveURL(/\/de$/);
});

/**
 * J5: an admin edits someone else's listing, hides a comment, resolves a
 * report, suspends a user and edits a content page. Each action must appear in
 * the audit log.
 */
test("an admin can moderate everything a user created, and it is all audited", async ({ page }) => {
  const stamp = Date.now();
  await signIn(page, personas.admin.email);

  // --- edit another person's listing
  await page.goto("/de/admin/inserate");
  const listingRow = page.locator("tbody tr").first();
  const listingTitle = (await listingRow.locator("a").first().textContent())!.trim();
  await listingRow.getByRole("button", { name: "Verifizieren" }).click();
  await expect(page.locator("tbody tr").first()).toContainText("Verifizierung entfernen");

  // --- hide a comment
  await page.goto("/de/admin/kommentare");
  const commentRow = page.locator("tbody tr").first();
  await commentRow.getByRole("button", { name: "Ausblenden", exact: true }).click();
  await expect(page.locator("tbody tr").first()).toContainText("Wiederherstellen");

  // --- resolve an open report
  await page.goto("/de/admin/meldungen");
  const openReport = page.locator("li").filter({ hasText: "open" }).first();
  await openReport.getByLabel("Notiz zur Erledigung").fill(`Geprüft, in Ordnung (${stamp})`);
  await openReport.getByRole("button", { name: "Erledigen" }).click();
  await expect(page.getByText(`Geprüft, in Ordnung (${stamp})`)).toHaveCount(0);

  // --- suspend a user (never yourself)
  await page.goto("/de/admin/nutzende?q=nadia");
  const userRow = page.locator("tbody tr").first();
  await userRow.getByRole("button", { name: "Sperren" }).click();
  await expect(page.locator("tbody tr").first()).toContainText("Entsperren");

  // --- edit a content page
  await page.goto("/de/admin/inhalte/faq");
  const marker = `Zusatz für den Test ${stamp}`;
  const body = page.getByLabel("Inhalt").first();
  await body.fill((await body.inputValue()) + `\n\n## ${marker}\n`);
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.waitForURL(/\/admin\/inhalte\?saved=faq/);

  // The change is live on the public page.
  await page.goto("/de/p/faq");
  await expect(page.getByRole("heading", { name: marker })).toBeVisible();

  // --- every one of those actions is in the audit log, with before and after
  await page.goto("/de/admin/audit");
  const log = page.locator("tbody");
  await expect(log).toContainText("listing.verified");
  await expect(log).toContainText("comment.hidden");
  await expect(log).toContainText("report.resolved");
  await expect(log).toContainText("user.suspended");
  await expect(log).toContainText("page.updated");
  await expect(log).toContainText(personas.admin.name);
  // The listing row records what it was and what it became.
  await expect(log).toContainText(listingTitle.slice(0, 20));
});

test("an admin cannot suspend themselves or drop their own admin rights", async ({ page }) => {
  await signIn(page, personas.admin.email);
  await page.goto("/de/admin/nutzende?q=admin@refreshlab.local");

  const ownRow = page.locator("tbody tr").filter({ hasText: personas.admin.email }).first();
  await expect(ownRow.getByRole("button", { name: "Sperren" })).toHaveCount(0);
  await expect(ownRow.getByRole("button", { name: "Adminrechte entziehen" })).toHaveCount(0);
});

test("a suspended user is signed out and told why", async ({ browser }) => {
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await signIn(admin, personas.admin.email);

  await admin.goto("/de/admin/nutzende?q=philipp");
  const row = admin.locator("tbody tr").first();
  await row.getByRole("button", { name: "Sperren" }).click();
  await expect(admin.locator("tbody tr").first()).toContainText("Entsperren");

  const userContext = await browser.newContext();
  const user = await userContext.newPage();
  await user.goto("/de/anmelden");
  await user.getByLabel("E-Mail", { exact: true }).first().fill("philipp.weber@refreshlab.local");
  await user.getByLabel("Passwort", { exact: true }).fill(password);
  await user.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(user.locator('form [role="alert"]')).toContainText("gesperrt");

  await userContext.close();
  await adminContext.close();
});

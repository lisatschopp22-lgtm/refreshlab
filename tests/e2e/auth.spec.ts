import { expect, test } from "@playwright/test";
import { password, personas } from "./personas";

test("a seeded account can sign in and reach the dashboard", async ({ page }) => {
  await page.goto("/de/anmelden");
  await page.getByLabel("E-Mail", { exact: true }).first().fill(personas.buyer.email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();

  await page.waitForURL(/\/de\/konto/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(personas.buyer.name);
});

test("a wrong password is rejected", async ({ page }) => {
  await page.goto("/de/anmelden");
  await page.getByLabel("E-Mail", { exact: true }).first().fill(personas.buyer.email);
  await page.getByLabel("Passwort", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
});

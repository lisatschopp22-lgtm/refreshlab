import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { password } from "./personas";

/**
 * J2: register → create an organisation → publish a listing with an image →
 * find it in search.
 */
test("a new user can register, create an organisation and publish a listing", async ({ page }) => {
  const stamp = Date.now();
  const email = `e2e.seller.${stamp}@refreshlab.test`;
  const orgName = `E2E Testlabor ${stamp}`;

  // --- register
  await page.goto("/de/registrieren");
  await page.getByLabel("Anzeigename").fill("E2E Verkäufer");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await page.waitForURL(/\/de\/konto/, { timeout: 20_000 });

  // --- create an organisation and sell as that organisation
  await page.goto("/de/konto/organisation");
  await page.getByLabel("Name der Organisation").fill(orgName);
  await page.getByLabel("Ort").fill("Zürich");
  await page.getByRole("button", { name: "Organisation erstellen" }).click();
  await expect(page.getByText(orgName).first()).toBeVisible({ timeout: 20_000 });

  // --- step 1: find the model in the catalogue
  await page.goto("/de/verkaufen");
  await page.getByLabel("Modell suchen").fill("Sorvall ST 8R");
  await page.getByRole("button", { name: /Sorvall ST 8R/ }).first().click();
  await page.getByLabel("Verkaufen als").selectOption({ label: orgName });
  await page.getByRole("button", { name: "Weiter zum Zustand" }).click();
  await page.waitForURL(/\/verkaufen\/.*\/zustand/, { timeout: 20_000 });

  // --- step 2: condition, notes and a real image upload
  const title = `E2E Sorvall ST 8R ${stamp}`;
  await page.getByLabel("Titel des Inserats").fill(title);
  await page.getByLabel("In welchem Zustand ist das Gerät?").selectOption("good");
  await page
    .getByLabel("Beschreibung des Zustands")
    .fill("Technisch geprüft, leichte Gebrauchsspuren am Gehäuse. Rotor TX-150 enthalten.");
  await page.getByLabel("Baujahr").fill("2019");

  await page.setInputFiles('input[name="files"]', {
    name: "geraet.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(
      readFileSync("public/globe.svg", "utf8").slice(0, 4000) || "<svg xmlns='http://www.w3.org/2000/svg'/>",
    ),
  });
  await expect(page.getByRole("button", { name: "Entfernen" }).first()).toBeVisible({ timeout: 20_000 });

  // The serial plate photo is required before the listing can be published.
  await page.setInputFiles('input[name="file"][accept^="image/"]', {
    name: "typenschild.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByText("Foto der Seriennummer gespeichert")).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: "Weiter zum Preis" }).click();
  await page.waitForURL(/\/verkaufen\/.*\/preis/, { timeout: 20_000 });

  // --- step 3: price
  await page.getByLabel("Preis", { exact: true }).fill("8400");
  await page.getByLabel("Standort", { exact: true }).fill("Zürich");
  await page.getByRole("button", { name: "Weiter zur Prüfung" }).click();
  await page.waitForURL(/\/verkaufen\/.*\/pruefen/, { timeout: 20_000 });

  // --- step 4: the seller's share of the fee is shown before publishing, then publish
  await expect(page.getByText("Plattformgebühr Verkäufer")).toBeVisible();
  await page.getByRole("button", { name: "Veröffentlichen" }).click();
  await page.waitForURL(/\/de\/geraete\//, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(title);

  // --- it is findable
  await page.goto(`/de/suche?q=${encodeURIComponent(String(stamp))}`);
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });
});

test("publishing is refused while required fields are missing", async ({ page }) => {
  await page.goto("/de/anmelden");
  await page.getByLabel("E-Mail", { exact: true }).first().fill("beat.seller@refreshlab.local");
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await page.waitForURL(/\/de\/konto/);

  await page.goto("/de/verkaufen");
  await page.getByLabel("Modell suchen").fill("Rotavapor R-300");
  await page.getByRole("button", { name: /Rotavapor R-300/ }).first().click();
  await page.getByRole("button", { name: "Weiter zum Zustand" }).click();
  await page.waitForURL(/\/verkaufen\/.*\/zustand/);

  const id = page.url().match(/verkaufen\/([^/]+)\//)![1];
  await page.goto(`/de/verkaufen/${id}/pruefen`);
  await page.getByRole("button", { name: "Veröffentlichen" }).click();

  // Scoped to the form: Next renders its own route announcer with role=alert.
  const alert = page.locator('form [role="alert"]');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Preis");
});

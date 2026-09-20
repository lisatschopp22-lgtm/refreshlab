import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

/**
 * The journeys buy, sell and dispute real rows, so they are not idempotent.
 * Re-seeding first makes every run start from the same catalogue instead of
 * from whatever the previous run left behind.
 *
 * Skip it with E2E_SKIP_SEED=1 when iterating on a single test.
 */
export default function globalSetup() {
  if (process.env.E2E_SKIP_SEED === "1") {
    console.log("[e2e] skipping reseed (E2E_SKIP_SEED=1)");
    return;
  }
  // Keep whichever images are in use. Re-seeding with the default would
  // silently throw away fetched photographs mid-session.
  const withPhotos = existsSync("supabase/reference-images.json");
  const args = withPhotos ? ["--images", "reference"] : [];

  console.log(`[e2e] reseeding the database${withPhotos ? " (with reference images)" : ""}…`);
  execFileSync("npx", ["tsx", "src/db/seed.ts", ...args], { stdio: "inherit" });
}

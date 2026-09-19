import { execFileSync } from "node:child_process";

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
  console.log("[e2e] reseeding the database…");
  execFileSync("npx", ["tsx", "src/db/seed.ts"], { stdio: "inherit" });
}

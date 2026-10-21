import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { settings } from "@/db/schema/operations";
import { defaultFlags } from "@/domain/flags";
import { flags, feeRule } from "@/domain/settings";
import { calculateFees, defaultFeeRule } from "@/domain/fees";

async function setStored(key: string, value: unknown) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

describe("settings", () => {
  // The tests run against the local database in use, so whatever an admin has
  // set there is put back afterwards rather than reset to the defaults.
  const keys = ["flags", "fee_rule"];
  let saved: { key: string; value: unknown }[] = [];

  beforeAll(async () => {
    saved = await db.select({ key: settings.key, value: settings.value }).from(settings);
  });

  afterAll(async () => {
    for (const key of keys) {
      const before = saved.find((row) => row.key === key);
      if (before) await setStored(key, before.value);
      else await db.delete(settings).where(eq(settings.key, key));
    }
  });

  it("reads the stored flags", async () => {
    await setStored("flags", { ...defaultFlags, offersEnabled: false });
    expect((await flags()).offersEnabled).toBe(false);

    await setStored("flags", { ...defaultFlags, offersEnabled: true });
    expect((await flags()).offersEnabled).toBe(true);
  });

  it("lets an environment variable override the stored value", async () => {
    await setStored("flags", { ...defaultFlags, buyNowEnabled: true });
    process.env.FLAG_BUY_NOW = "false";
    expect((await flags()).buyNowEnabled).toBe(false);
    delete process.env.FLAG_BUY_NOW;
    expect((await flags()).buyNowEnabled).toBe(true);
  });

  it("falls back to the defaults when nothing is stored", async () => {
    await db.delete(settings).where(eq(settings.key, "flags"));
    expect(await flags()).toEqual(defaultFlags);
  });

  it("applies a changed fee rule to the calculation", async () => {
    await setStored("fee_rule", { ...defaultFeeRule, sellerPercent: 4, buyerPercent: 1 });
    const fees = calculateFees(1_000_000, "CHF", await feeRule());
    expect(fees.seller.cents).toBe(40_000);
    expect(fees.buyer.cents).toBe(10_000);

    await setStored("fee_rule", defaultFeeRule);
    expect(calculateFees(1_000_000, "CHF", await feeRule()).total.cents).toBe(60_000);
  });

  it("ignores a rule stored before the volume tiers", async () => {
    await setStored("fee_rule", { sellerPercent: 3, buyerPercent: 2, capCents: null, minCents: 0 });
    expect(await feeRule()).toEqual(defaultFeeRule);
  });
});

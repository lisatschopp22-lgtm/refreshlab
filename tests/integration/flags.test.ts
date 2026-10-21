import { afterAll, describe, expect, it } from "vitest";
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
  afterAll(async () => {
    await setStored("flags", defaultFlags);
    await setStored("fee_rule", defaultFeeRule);
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
    await setStored("fee_rule", { sellerPercent: 4, buyerPercent: 1, capCents: null, minCents: 0 });
    const fees = calculateFees(1_000_000, "CHF", await feeRule());
    expect(fees.seller.cents).toBe(40_000);
    expect(fees.buyer.cents).toBe(10_000);

    await setStored("fee_rule", defaultFeeRule);
    expect(calculateFees(1_000_000, "CHF", await feeRule()).total.cents).toBe(50_000);
  });

  it("ignores a rule stored before the split", async () => {
    await setStored("fee_rule", { percent: 1, capCents: 50_000, minCents: 2_000 });
    expect(await feeRule()).toEqual(defaultFeeRule);
  });
});

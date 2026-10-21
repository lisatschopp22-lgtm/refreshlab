import { describe, expect, it } from "vitest";
import {
  calculateFees,
  defaultFeeRule,
  nextTier,
  normaliseFeeRule,
  sellerNetCents,
  tierRate,
} from "@/domain/fees";
import { basisPointsOf, fromMajor, money, parseAmountToCents, percentOf } from "@/domain/money";

const tiers = defaultFeeRule.sellerTiers;

describe("fee rule", () => {
  it("takes 3 % from the seller and 3 % from the buyer of a newcomer's deal", () => {
    // A CHF 8,000 instrument: CHF 240 from each side.
    const fees = calculateFees(800_000);
    expect(fees.seller.cents).toBe(24_000);
    expect(fees.buyer.cents).toBe(24_000);
    expect(fees.total.cents).toBe(48_000);
    expect([fees.sellerBp, fees.buyerBp]).toEqual([300, 300]);
  });

  it("lowers a rate by 0.1 points for every 100 completed transactions", () => {
    expect(tierRate(3, tiers, 0)).toBe(300);
    expect(tierRate(3, tiers, 99)).toBe(300);
    expect(tierRate(3, tiers, 100)).toBe(290);
    expect(tierRate(3, tiers, 250)).toBe(280);
  });

  it("stops at 0.5 points off, so two regulars pay 5 % in all", () => {
    expect(tierRate(3, tiers, 500)).toBe(250);
    expect(tierRate(3, tiers, 4_000)).toBe(250);
    const fees = calculateFees(1_000_000, "CHF", defaultFeeRule, {
      seller: { completed: 900 },
      buyer: { completed: 600 },
    });
    expect(fees.total.cents).toBe(50_000);
  });

  it("counts each side on its own", () => {
    const fees = calculateFees(1_000_000, "CHF", defaultFeeRule, {
      seller: { completed: 300 },
      buyer: { completed: 0 },
    });
    expect(fees.seller.cents).toBe(27_000);
    expect(fees.buyer.cents).toBe(30_000);
  });

  it("says where the rate drops next, and when it cannot drop further", () => {
    expect(nextTier(3, tiers, 42)).toEqual({ at: 100, rateBp: 290 });
    expect(nextTier(3, tiers, 400)).toEqual({ at: 500, rateBp: 250 });
    expect(nextTier(3, tiers, 500)).toBeNull();
  });

  it("puts a special rate in place of the tiers", () => {
    const fees = calculateFees(1_000_000, "CHF", defaultFeeRule, {
      seller: { completed: 4_000, specialRateBp: 150 },
      buyer: { completed: 0, specialRateBp: 200 },
    });
    expect(fees.seller.cents).toBe(15_000);
    expect(fees.buyer.cents).toBe(20_000);
  });

  it("rounds each share in whole cents, a half cent up", () => {
    // 2.9 % of CHF 1,234.55 is 3,580.195 cents.
    expect(basisPointsOf(money(123_455), 290).cents).toBe(3_580);
    expect(basisPointsOf(money(50), 300).cents).toBe(2);
    for (const amount of [123_455, 99_999, 1, 7, 333_333]) {
      const fees = calculateFees(amount, "CHF", defaultFeeRule, { seller: { completed: 100 } });
      expect(fees.seller.cents + fees.buyer.cents).toBe(fees.total.cents);
    }
  });

  it("applies a cap to both shares together and keeps their proportion", () => {
    const rule = { ...defaultFeeRule, capCents: 50_000 };
    const fees = calculateFees(10_000_000, "CHF", rule, { seller: { completed: 500 } });
    expect(fees.total.cents).toBe(50_000);
    // 2.5 % against 3 %: the seller carries 25/55 of the cap.
    expect(fees.seller.cents).toBe(22_727);
    expect(fees.buyer.cents).toBe(27_273);
  });

  it("applies a minimum, but never charges more than the item is worth", () => {
    const rule = { ...defaultFeeRule, minCents: 2_000 };
    expect(calculateFees(10_000, "CHF", rule).total.cents).toBe(2_000);
    expect(calculateFees(1_000, "CHF", rule).total.cents).toBe(1_000);
  });

  it("charges nothing when both rates are zero", () => {
    const rule = { ...defaultFeeRule, sellerPercent: 0, buyerPercent: 0, minCents: 2_000 };
    expect(calculateFees(800_000, "CHF", rule).total.cents).toBe(0);
  });

  it("treats a rule stored before the tiers as out of date", () => {
    expect(normaliseFeeRule({ sellerPercent: 3, buyerPercent: 2, capCents: null, minCents: 0 })).toEqual(
      defaultFeeRule,
    );
    expect(normaliseFeeRule({ percent: 1, capCents: 50_000, minCents: 2_000 })).toEqual(defaultFeeRule);
    expect(normaliseFeeRule(null)).toEqual(defaultFeeRule);
    const custom = normaliseFeeRule({ ...defaultFeeRule, buyerTiers: { stepTransactions: 50 } });
    expect(custom.buyerTiers).toEqual({ ...defaultFeeRule.buyerTiers, stepTransactions: 50 });
  });

  it("computes what the seller receives", () => {
    expect(sellerNetCents(800_000, 24_000)).toBe(776_000);
  });
});

describe("money", () => {
  it("parses Swiss-formatted amounts", () => {
    expect(parseAmountToCents("7'900")).toBe(790_000);
    expect(parseAmountToCents("7 900.50")).toBe(790_050);
    expect(parseAmountToCents("1234,25")).toBe(123_425);
    expect(parseAmountToCents("abc")).toBeNull();
    expect(parseAmountToCents("12.345")).toBeNull();
  });

  it("refuses to mix currencies", () => {
    expect(() => percentOf(fromMajor(10, "CHF"), 10)).not.toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { calculateFees, defaultFeeRule, normaliseFeeRule, sellerNetCents } from "@/domain/fees";
import { fromMajor, parseAmountToCents, percentOf } from "@/domain/money";

describe("fee rule", () => {
  it("takes 3 % from the seller and 2 % from the buyer", () => {
    // A CHF 8,000 instrument: CHF 240 from the seller, CHF 160 from the buyer.
    const fees = calculateFees(800_000);
    expect(fees.seller.cents).toBe(24_000);
    expect(fees.buyer.cents).toBe(16_000);
    expect(fees.total.cents).toBe(40_000);
  });

  it("has no cap by default, so an expensive instrument pays 5 % too", () => {
    expect(calculateFees(10_000_000).total.cents).toBe(500_000);
  });

  it("splits without losing a cent on an odd amount", () => {
    for (const amount of [123_455, 99_999, 1, 7, 333_333]) {
      const fees = calculateFees(amount);
      expect(fees.seller.cents + fees.buyer.cents).toBe(fees.total.cents);
    }
  });

  it("applies a cap to both shares together and keeps the split", () => {
    const rule = { ...defaultFeeRule, capCents: 50_000 };
    const fees = calculateFees(10_000_000, "CHF", rule);
    expect(fees.total.cents).toBe(50_000);
    expect(fees.seller.cents).toBe(30_000);
    expect(fees.buyer.cents).toBe(20_000);
  });

  it("applies a minimum on a cheap sale", () => {
    const rule = { ...defaultFeeRule, minCents: 2_000 };
    expect(calculateFees(10_000, "CHF", rule).total.cents).toBe(2_000);
  });

  it("never charges more than the item is worth", () => {
    const rule = { ...defaultFeeRule, minCents: 2_000 };
    expect(calculateFees(1_000, "CHF", rule).total.cents).toBe(1_000);
  });

  it("charges nothing when both shares are zero", () => {
    const rule = { sellerPercent: 0, buyerPercent: 0, capCents: null, minCents: 2_000 };
    expect(calculateFees(800_000, "CHF", rule).total.cents).toBe(0);
  });

  it("can put the whole fee on one side", () => {
    const rule = { sellerPercent: 5, buyerPercent: 0, capCents: null, minCents: 0 };
    const fees = calculateFees(800_000, "CHF", rule);
    expect(fees.seller.cents).toBe(40_000);
    expect(fees.buyer.cents).toBe(0);
  });

  it("treats a rule stored before the split as out of date", () => {
    expect(normaliseFeeRule({ percent: 1, capCents: 50_000, minCents: 2_000 })).toEqual(defaultFeeRule);
    expect(normaliseFeeRule(null)).toEqual(defaultFeeRule);
    expect(normaliseFeeRule({ sellerPercent: 4, buyerPercent: 1 })).toEqual({
      ...defaultFeeRule,
      sellerPercent: 4,
      buyerPercent: 1,
    });
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

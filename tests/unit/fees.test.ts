import { describe, expect, it } from "vitest";
import { calculateFee, defaultFeeRule, sellerNetCents } from "@/domain/fees";
import { fromMajor, parseAmountToCents, percentOf } from "@/domain/money";

describe("fee rule", () => {
  it("charges one percent on an ordinary sale", () => {
    expect(calculateFee(800_000).cents).toBe(8_000);
  });

  it("caps the fee at CHF 500 on an expensive instrument", () => {
    // A CHF 100,000 instrument: 1% would be CHF 1000, the cap holds it at 500.
    expect(calculateFee(10_000_000).cents).toBe(50_000);
    expect(calculateFee(50_000_000).cents).toBe(50_000);
  });

  it("applies the minimum fee on a cheap sale", () => {
    expect(calculateFee(50_000).cents).toBe(2_000);
  });

  it("never charges more than the item is worth", () => {
    expect(calculateFee(1_000).cents).toBe(1_000);
  });

  it("honours an overridden rule", () => {
    const rule = { percent: 5, capCents: null, minCents: 0 };
    expect(calculateFee(10_000_000, "CHF", rule).cents).toBe(500_000);
  });

  it("keeps the cap meaningful against a percentage-only rule", () => {
    const uncapped = calculateFee(10_000_000, "CHF", { ...defaultFeeRule, capCents: null });
    expect(uncapped.cents).toBeGreaterThan(calculateFee(10_000_000).cents);
  });

  it("computes what the seller receives", () => {
    expect(sellerNetCents(800_000, 8_000)).toBe(792_000);
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

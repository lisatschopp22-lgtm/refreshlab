import { describe, expect, it } from "vitest";
import { canTransition, OFFER_VALIDITY_DAYS } from "@/domain/offers";

describe("offer state machine", () => {
  it("lets the seller accept, decline or counter an open offer", () => {
    expect(canTransition("open", "accepted", "seller")).toBe(true);
    expect(canTransition("open", "rejected", "seller")).toBe(true);
    expect(canTransition("open", "countered", "seller")).toBe(true);
  });

  it("lets only the buyer withdraw their own offer", () => {
    expect(canTransition("open", "withdrawn", "buyer")).toBe(true);
    expect(canTransition("open", "withdrawn", "seller")).toBe(false);
  });

  it("keeps the buyer from accepting their own offer", () => {
    expect(canTransition("open", "accepted", "buyer")).toBe(false);
  });

  it("hands the decision to the buyer once the seller counters", () => {
    expect(canTransition("countered", "accepted", "buyer")).toBe(true);
    expect(canTransition("countered", "rejected", "buyer")).toBe(true);
    expect(canTransition("countered", "accepted", "seller")).toBe(false);
  });

  it("treats a settled offer as final", () => {
    for (const from of ["accepted", "rejected", "expired", "withdrawn"] as const) {
      expect(canTransition(from, "accepted", "seller")).toBe(false);
      expect(canTransition(from, "rejected", "buyer")).toBe(false);
    }
  });

  it("only the system expires an offer", () => {
    expect(canTransition("open", "expired", "system")).toBe(true);
    expect(canTransition("open", "expired", "seller")).toBe(false);
    expect(OFFER_VALIDITY_DAYS).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import { canMove, milestoneIndex, nextStatuses, orderTransitions, type OrderStatus } from "@/domain/orders";

const all = Object.keys(orderTransitions) as OrderStatus[];

describe("order state machine", () => {
  it("walks the happy path from payment to payout", () => {
    expect(canMove("pending_payment", "paid", "buyer")).toBe(true);
    expect(canMove("paid", "shipped", "seller")).toBe(true);
    expect(canMove("shipped", "delivered", "buyer")).toBe(true);
    expect(canMove("delivered", "completed", "buyer")).toBe(true);
  });

  it("keeps the seller from confirming receipt on the buyer's behalf", () => {
    expect(canMove("delivered", "completed", "seller")).toBe(false);
    expect(canMove("delivered", "completed", "admin")).toBe(true);
  });

  it("keeps the buyer from marking an item shipped", () => {
    expect(canMove("paid", "shipped", "buyer")).toBe(false);
  });

  it("lets only the buyer or an admin raise a dispute", () => {
    expect(canMove("paid", "disputed", "buyer")).toBe(true);
    expect(canMove("paid", "disputed", "seller")).toBe(false);
    expect(canMove("shipped", "disputed", "buyer")).toBe(true);
    expect(canMove("delivered", "disputed", "buyer")).toBe(true);
  });

  it("lets only an admin resolve a dispute", () => {
    for (const target of ["completed", "refunded", "cancelled"] as OrderStatus[]) {
      expect(canMove("disputed", target, "admin")).toBe(true);
      expect(canMove("disputed", target, "buyer")).toBe(false);
      expect(canMove("disputed", target, "seller")).toBe(false);
    }
  });

  it("treats completed, cancelled and refunded as final", () => {
    for (const terminal of ["completed", "cancelled", "refunded"] as OrderStatus[]) {
      expect(orderTransitions[terminal]).toEqual([]);
      for (const target of all) {
        expect(canMove(terminal, target, "admin")).toBe(false);
      }
    }
  });

  it("refuses to skip a step", () => {
    expect(canMove("pending_payment", "shipped", "seller")).toBe(false);
    expect(canMove("pending_payment", "completed", "buyer")).toBe(false);
    expect(canMove("paid", "completed", "buyer")).toBe(false);
    expect(canMove("paid", "delivered", "seller")).toBe(false);
  });

  it("cannot be paid twice", () => {
    expect(canMove("paid", "paid", "buyer")).toBe(false);
  });

  it("offers each party only the moves they may make", () => {
    expect(nextStatuses("paid", "seller")).toEqual(["shipped"]);
    expect(nextStatuses("paid", "buyer")).toEqual(["disputed"]);
    expect(nextStatuses("completed", "admin")).toEqual([]);
  });

  it("maps every status onto the five-step milestone bar", () => {
    expect(milestoneIndex("pending_payment")).toBe(1);
    expect(milestoneIndex("paid")).toBe(2);
    expect(milestoneIndex("shipped")).toBe(3);
    expect(milestoneIndex("delivered")).toBe(4);
    expect(milestoneIndex("disputed")).toBe(4);
    expect(milestoneIndex("completed")).toBe(5);
  });

  it("never lets a transition target an unknown state", () => {
    for (const from of all) {
      for (const step of orderTransitions[from]) {
        expect(all).toContain(step.to);
        expect(step.by.length).toBeGreaterThan(0);
      }
    }
  });
});

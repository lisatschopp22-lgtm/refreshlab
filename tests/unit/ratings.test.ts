import { describe, expect, it } from "vitest";
import type { SessionUser } from "@/auth/session";
import { ratingSideOf } from "@/domain/permissions";
import { RATING_PERIOD_DAYS, ratingOpen, ratingPeriodEnds, ratingRevealed, shortName } from "@/domain/ratings";

const day = 86_400_000;
const completedAt = new Date("2026-10-01T12:00:00Z");

function user(id: string, extra: Partial<SessionUser> = {}): SessionUser {
  return {
    id,
    email: `${id}@example.test`,
    displayName: id,
    role: "user",
    locale: "de",
    avatarPath: null,
    suspendedAt: null,
    verifiedAt: null,
    organisations: [],
    ...extra,
  };
}

const order = { buyerId: "buyer", sellerId: "seller", sellerOrgId: "org" };

describe("who rates from which side", () => {
  it("lets the buyer rate the seller and the seller rate the buyer", () => {
    expect(ratingSideOf(user("buyer"), order)).toBe("buyer");
    expect(ratingSideOf(user("seller"), order)).toBe("seller");
  });

  it("lets a colleague in the selling organisation rate for the seller", () => {
    const colleague = user("colleague", {
      organisations: [{ id: "org", name: "Org", slug: "org", role: "member", canPublish: true }],
    });
    expect(ratingSideOf(colleague, order)).toBe("seller");
  });

  it("gives an admin looking on no side, and a suspended party none either", () => {
    expect(ratingSideOf(user("admin", { role: "admin" }), order)).toBeNull();
    expect(ratingSideOf(user("buyer", { suspendedAt: new Date() }), order)).toBeNull();
    expect(ratingSideOf(null, order)).toBeNull();
  });
});

describe("rating period", () => {
  it(`ends ${RATING_PERIOD_DAYS} days after completion`, () => {
    expect(ratingPeriodEnds({ completedAt })?.getTime()).toBe(completedAt.getTime() + RATING_PERIOD_DAYS * day);
    expect(ratingPeriodEnds({ completedAt: null })).toBeNull();
  });

  it("is open only for a completed deal within the period", () => {
    const completed = { status: "completed" as const, completedAt };
    expect(ratingOpen(completed, new Date(completedAt.getTime() + day))).toBe(true);
    expect(ratingOpen(completed, new Date(completedAt.getTime() + (RATING_PERIOD_DAYS + 1) * day))).toBe(false);
    expect(ratingOpen({ status: "delivered", completedAt: null })).toBe(false);
  });
});

describe("revealing ratings together", () => {
  const periodEnds = ratingPeriodEnds({ completedAt });
  const during = new Date(completedAt.getTime() + day);
  const after = new Date(completedAt.getTime() + (RATING_PERIOD_DAYS + 1) * day);

  it("holds a rating back until the other side has rated", () => {
    expect(ratingRevealed({ together: true, otherSideRated: false, periodEnds, now: during })).toBe(false);
    expect(ratingRevealed({ together: true, otherSideRated: true, periodEnds, now: during })).toBe(true);
  });

  it("shows it anyway once the period has ended", () => {
    expect(ratingRevealed({ together: true, otherSideRated: false, periodEnds, now: after })).toBe(true);
  });

  it("shows every rating at once when the flag is off", () => {
    expect(ratingRevealed({ together: false, otherSideRated: false, periodEnds, now: during })).toBe(true);
  });
});

describe("names on public ratings", () => {
  it("shortens a person to first name and initial", () => {
    expect(shortName("Anna Iten")).toBe("Anna I.");
    expect(shortName("  Ana María López García ")).toBe("Ana G.");
    expect(shortName("Beat")).toBe("Beat");
  });
});

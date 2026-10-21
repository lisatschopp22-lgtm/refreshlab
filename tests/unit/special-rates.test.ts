import { describe, expect, it } from "vitest";
import type { SessionUser } from "@/auth/session";
import { canManageSpecialRates, canRequestSpecialRate } from "@/domain/permissions";
import { specialRateAllowed } from "@/domain/special-rates";

function user(role: "owner" | "member" | null, extra: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "person",
    email: "person@example.test",
    displayName: "Person",
    role: "user",
    locale: "de",
    avatarPath: null,
    suspendedAt: null,
    verifiedAt: null,
    organisations: role ? [{ id: "org", name: "Org", slug: "org", role, canPublish: true }] : [],
    ...extra,
  };
}

describe("special rates", () => {
  it("are for dealers when selling and for any organisation when buying", () => {
    expect(specialRateAllowed("seller", "dealer")).toBe(true);
    expect(specialRateAllowed("seller", "company")).toBe(false);
    expect(specialRateAllowed("buyer", "company")).toBe(true);
    expect(specialRateAllowed("buyer", "university")).toBe(true);
  });

  it("can be asked for by the organisation's owner only", () => {
    expect(canRequestSpecialRate(user("owner"), "org")).toBe(true);
    expect(canRequestSpecialRate(user("member"), "org")).toBe(false);
    expect(canRequestSpecialRate(user(null), "org")).toBe(false);
    expect(canRequestSpecialRate(user("owner", { suspendedAt: new Date() }), "org")).toBe(false);
  });

  it("are approved, changed and ended by an admin only", () => {
    expect(canManageSpecialRates(user(null, { role: "admin" }))).toBe(true);
    expect(canManageSpecialRates(user("owner"))).toBe(false);
  });
});

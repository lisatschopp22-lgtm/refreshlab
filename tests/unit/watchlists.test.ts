import { describe, expect, it } from "vitest";
import type { SessionUser } from "@/auth/session";
import { canEditWatchList } from "@/domain/permissions";

function user(id: string, role: "user" | "admin" = "user"): SessionUser {
  return {
    id,
    email: `${id}@example.test`,
    displayName: id,
    role,
    locale: "de",
    avatarPath: null,
    suspendedAt: null,
    verifiedAt: null,
    organisations: [],
  };
}

describe("lists of saved listings", () => {
  it("belong to their person alone, an admin included", () => {
    const list = { profileId: "anna" };
    expect(canEditWatchList(user("anna"), list)).toBe(true);
    expect(canEditWatchList(user("beat"), list)).toBe(false);
    expect(canEditWatchList(user("admin", "admin"), list)).toBe(false);
    expect(canEditWatchList(null, list)).toBe(false);
  });
});

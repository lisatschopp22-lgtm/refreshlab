import { describe, expect, it } from "vitest";
import { listingNeedsReview, readyToPublish } from "@/domain/listings";
import type { listings } from "@/db/schema/marketplace";

const complete = {
  title: "Sorvall ST 8R",
  priceCents: 840_000,
  locationCity: "Zürich",
  conditionNotes: "Technisch geprüft.",
} as typeof listings.$inferSelect;

describe("publishing a listing", () => {
  it("needs a photo of the serial number", () => {
    expect(readyToPublish(complete, 3, false)).toEqual(["serialPhoto"]);
    expect(readyToPublish(complete, 3, true)).toEqual([]);
  });

  it("holds a listing back while its instrument is new to the catalogue", () => {
    expect(listingNeedsReview({ modelStatus: "pending", reviewFlag: false, isAdmin: false })).toBe(true);
    expect(listingNeedsReview({ modelStatus: "published", reviewFlag: false, isAdmin: false })).toBe(false);
  });

  it("still follows the review flag for known instruments", () => {
    expect(listingNeedsReview({ modelStatus: "published", reviewFlag: true, isAdmin: false })).toBe(true);
  });

  it("lets an administrator publish directly", () => {
    expect(listingNeedsReview({ modelStatus: "pending", reviewFlag: true, isAdmin: true })).toBe(false);
  });
});

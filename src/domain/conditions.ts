import type { Listing } from "@/db/schema/marketplace";

export const conditions = ["new", "like_new", "good", "fair", "for_parts"] as const;
export type Condition = (typeof conditions)[number];

/** Letter grade shown on cards, mirroring the inspection report in mockup S11. */
export const conditionGrade: Record<Condition, string> = {
  new: "A+",
  like_new: "A",
  good: "B",
  fair: "C",
  for_parts: "D",
};

export const conditionTone: Record<Condition, "success" | "primary" | "warning" | "neutral"> = {
  new: "success",
  like_new: "success",
  good: "primary",
  fair: "warning",
  for_parts: "neutral",
};

/**
 * A seller's own grading is a claim. Only an inspection makes it a finding.
 * The UI must keep the two apart (requirements review §1.2).
 */
export function conditionSource(listing: Pick<Listing, "inspectedAt">) {
  return listing.inspectedAt ? "verified" : "declared";
}

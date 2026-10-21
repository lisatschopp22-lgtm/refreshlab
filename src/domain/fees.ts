import type { Currency } from "@/db/schema/common";
import { add, basisPointsOf, money, shareOf, subtract, type Money } from "./money";

/**
 * The platform's share of every sale, from both sides. The product owner set
 * it on 2026-10-21: 3 % from the seller's payout and 3 % on top of what the
 * buyer pays. Whoever trades a lot pays less: 0.1 percentage points off for
 * every 100 completed transactions in that role, at most 0.5, so a deal
 * between two regulars costs 5 % in all. A dealer or a large company can get
 * a special rate instead, approved by an admin. An optional cap and minimum
 * apply to both shares together. Admin → Settings overrides all of it.
 */
export type FeeTiers = {
  /** Completed transactions per step, e.g. 100. */
  stepTransactions: number;
  /** Percentage points off per step, e.g. 0.1. */
  stepPercent: number;
  /** At most this many percentage points off, e.g. 0.5. */
  maxPercent: number;
};

export type FeeRule = {
  sellerPercent: number;
  buyerPercent: number;
  sellerTiers: FeeTiers;
  buyerTiers: FeeTiers;
  /** Upper limit for both shares together; null for none. */
  capCents: number | null;
  /** Lower limit for both shares together. */
  minCents: number;
};

export const defaultFeeRule: FeeRule = {
  sellerPercent: 3,
  buyerPercent: 3,
  sellerTiers: { stepTransactions: 100, stepPercent: 0.1, maxPercent: 0.5 },
  buyerTiers: { stepTransactions: 100, stepPercent: 0.1, maxPercent: 0.5 },
  capCents: null,
  minCents: 0,
};

/** Percent as entered (3, 2.5, 0.1) in basis points (300, 250, 10), so the maths stays in whole numbers. */
export const toBasisPoints = (percent: number) => Math.round(percent * 100);

/** The rate after the volume discount, in basis points. */
export function tierRate(basePercent: number, tiers: FeeTiers, completed: number): number {
  const base = toBasisPoints(basePercent);
  if (tiers.stepTransactions <= 0) return base;
  const steps = Math.floor(Math.max(0, completed) / tiers.stepTransactions);
  const discount = Math.min(steps * toBasisPoints(tiers.stepPercent), toBasisPoints(tiers.maxPercent));
  return Math.max(0, base - discount);
}

/** Where the rate drops next: after how many completed transactions, and to what. Null once at the lowest rate. */
export function nextTier(
  basePercent: number,
  tiers: FeeTiers,
  completed: number,
): { at: number; rateBp: number } | null {
  if (tiers.stepTransactions <= 0 || toBasisPoints(tiers.stepPercent) <= 0) return null;
  const current = tierRate(basePercent, tiers, completed);
  const at = (Math.floor(Math.max(0, completed) / tiers.stepTransactions) + 1) * tiers.stepTransactions;
  const next = tierRate(basePercent, tiers, at);
  return next < current ? { at, rateBp: next } : null;
}

/** One side of a deal: how many transactions it has completed in that role, and any special rate. */
export type FeeParty = { completed?: number; specialRateBp?: number | null };

export type Fees = { seller: Money; buyer: Money; total: Money; sellerBp: number; buyerBp: number };

export function calculateFees(
  amountCents: number,
  currency: Currency = "CHF",
  rule: FeeRule = defaultFeeRule,
  parties: { seller?: FeeParty; buyer?: FeeParty } = {},
): Fees {
  const sellerBp =
    parties.seller?.specialRateBp ?? tierRate(rule.sellerPercent, rule.sellerTiers, parties.seller?.completed ?? 0);
  const buyerBp =
    parties.buyer?.specialRateBp ?? tierRate(rule.buyerPercent, rule.buyerTiers, parties.buyer?.completed ?? 0);

  const amount = money(amountCents, currency);
  let seller = basisPointsOf(amount, sellerBp);
  let buyer = basisPointsOf(amount, buyerBp);
  const raw = add(seller, buyer);

  if (sellerBp + buyerBp > 0) {
    const capped = rule.capCents === null ? raw.cents : Math.min(raw.cents, rule.capCents);
    // Never charge more than the item itself is worth.
    const limited = Math.min(Math.max(capped, rule.minCents), amount.cents);
    if (limited !== raw.cents) {
      // A cap or minimum moves the total; the two sides keep their proportion.
      const total = money(limited, currency);
      seller = shareOf(total, sellerBp, sellerBp + buyerBp);
      buyer = subtract(total, seller);
    }
  }

  return { seller, buyer, total: add(seller, buyer), sellerBp, buyerBp };
}

/**
 * A rule stored before the volume tiers has no tiers and is out of date, so the
 * default applies; a current one gets any missing field from the default.
 */
export function normaliseFeeRule(stored: unknown): FeeRule {
  const rule = stored as Partial<FeeRule> | null | undefined;
  const current =
    typeof rule?.sellerPercent === "number" &&
    typeof rule.buyerPercent === "number" &&
    !!rule.sellerTiers &&
    !!rule.buyerTiers;
  if (!current) return defaultFeeRule;
  return {
    ...defaultFeeRule,
    ...rule,
    sellerTiers: { ...defaultFeeRule.sellerTiers, ...rule.sellerTiers },
    buyerTiers: { ...defaultFeeRule.buyerTiers, ...rule.buyerTiers },
  };
}

export function sellerNetCents(amountCents: number, sellerFeeCents: number) {
  return Math.max(0, amountCents - sellerFeeCents);
}

import type { Currency } from "@/db/schema/common";
import { min, money, percentOf, subtract, type Money } from "./money";

/**
 * The platform's share of every sale, split between the two parties. The
 * product owner set it on 2026-10-21: 5 % in all, of which 3 % comes off the
 * seller's payout and 2 % is added to what the buyer pays. An optional cap and
 * minimum apply to both shares together. Admin → Settings overrides this at
 * runtime.
 */
export type FeeRule = {
  /** Deducted from the seller's payout, in percent of the item price. */
  sellerPercent: number;
  /** Added to the buyer's payment, in percent of the item price. */
  buyerPercent: number;
  /** Upper limit for both shares together; null for none. */
  capCents: number | null;
  /** Lower limit for both shares together. */
  minCents: number;
};

export const defaultFeeRule: FeeRule = {
  sellerPercent: 3,
  buyerPercent: 2,
  capCents: null,
  minCents: 0,
};

export type Fees = { seller: Money; buyer: Money; total: Money };

export function calculateFees(
  amountCents: number,
  currency: Currency = "CHF",
  rule: FeeRule = defaultFeeRule,
): Fees {
  const amount = money(amountCents, currency);
  const percent = rule.sellerPercent + rule.buyerPercent;
  if (percent <= 0) {
    const none = money(0, currency);
    return { seller: none, buyer: none, total: none };
  }

  const share = percentOf(amount, percent);
  const capped = rule.capCents === null ? share : min(share, money(rule.capCents, currency));
  const floored = Math.max(capped.cents, rule.minCents);
  // Never charge more than the item itself is worth.
  const total = money(Math.min(floored, amount.cents), currency);

  // Split the total instead of rounding each share, so the two always add up.
  const seller = percentOf(total, (rule.sellerPercent * 100) / percent);
  return { seller, buyer: subtract(total, seller), total };
}

/** A rule stored before the split has no shares and is out of date, so the default applies. */
export function normaliseFeeRule(stored: unknown): FeeRule {
  const rule = stored as Partial<FeeRule> | null | undefined;
  return typeof rule?.sellerPercent === "number" && typeof rule.buyerPercent === "number"
    ? { ...defaultFeeRule, ...rule }
    : defaultFeeRule;
}

export function sellerNetCents(amountCents: number, sellerFeeCents: number) {
  return Math.max(0, amountCents - sellerFeeCents);
}

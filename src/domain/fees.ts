import type { Currency } from "@/db/schema/common";
import { min, money, percentOf, type Money } from "./money";

/**
 * The fee model is an open business question (execution-plan §9.4). The default
 * is the example from the requirements session: 1 % of the sale price, capped
 * at CHF 500, so refreshLab stays far cheaper than a general auction site on
 * expensive instruments. Admin → Settings overrides this at runtime.
 */
export type FeeRule = {
  percent: number;
  capCents: number | null;
  minCents: number;
};

export const defaultFeeRule: FeeRule = {
  percent: 1,
  capCents: 50_000,
  minCents: 2_000,
};

export function calculateFee(
  amountCents: number,
  currency: Currency = "CHF",
  rule: FeeRule = defaultFeeRule,
): Money {
  const amount = money(amountCents, currency);
  const percentage = percentOf(amount, rule.percent);
  const capped = rule.capCents === null ? percentage : min(percentage, money(rule.capCents, currency));
  const floored = Math.max(capped.cents, rule.minCents);
  // Never charge more than the item itself is worth.
  return money(Math.min(floored, amount.cents), currency);
}

export function sellerNetCents(amountCents: number, feeCents: number) {
  return Math.max(0, amountCents - feeCents);
}

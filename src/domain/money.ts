import type { Currency } from "@/db/schema/common";

/** All money is integer cents. Nothing outside this module does money maths. */
export type Money = { cents: number; currency: Currency };

export function money(cents: number, currency: Currency = "CHF"): Money {
  return { cents: Math.round(cents), currency };
}

export function fromMajor(amount: number, currency: Currency = "CHF"): Money {
  return money(Math.round(amount * 100), currency);
}

export function add(a: Money, b: Money): Money {
  assertSame(a, b);
  return money(a.cents + b.cents, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSame(a, b);
  return money(a.cents - b.cents, a.currency);
}

export function percentOf(amount: Money, percent: number): Money {
  return money(Math.round((amount.cents * percent) / 100), amount.currency);
}

/** A rate in basis points, 300 being 3 %. Whole numbers until the last step, so a half cent always rounds up. */
export function basisPointsOf(amount: Money, basisPoints: number): Money {
  return money(Math.round((amount.cents * basisPoints) / 10_000), amount.currency);
}

/** The part of `total` that `part` is of `whole`, for splitting by weight. */
export function shareOf(total: Money, part: number, whole: number): Money {
  return money(Math.round((total.cents * part) / whole), total.currency);
}

export function min(a: Money, b: Money): Money {
  assertSame(a, b);
  return a.cents <= b.cents ? a : b;
}

function assertSame(a: Money, b: Money) {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot combine ${a.currency} with ${b.currency}`);
  }
}

/** Parses "7900", "7'900", "7 900.50" into cents. Returns null when unusable. */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/['\s’]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

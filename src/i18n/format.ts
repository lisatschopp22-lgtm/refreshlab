import type { Currency } from "@/db/schema/common";
import type { Locale } from "./routing";

/** Swiss money formatting: CHF 7'900. Prices are integer cents everywhere. */
export function formatMoney(cents: number, currency: Currency, locale: Locale = "de") {
  const value = cents / 100;
  const formatted = new Intl.NumberFormat(locale === "de" ? "de-CH" : "en-CH", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${currency} ${formatted}`;
}

export function formatNumber(value: number, locale: Locale = "de") {
  return new Intl.NumberFormat(locale === "de" ? "de-CH" : "en-CH").format(value);
}

/** Takes percent points: 3 becomes "3%". */
export function formatPercent(value: number, locale: Locale = "de") {
  return new Intl.NumberFormat(locale === "de" ? "de-CH" : "en-CH", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function formatDate(date: Date | string | null, locale: Locale = "de") {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "de" ? "de-CH" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string | null, locale: Locale = "de") {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "de" ? "de-CH" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function relativeTime(date: Date | string, locale: Locale = "de") {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const minutes = Math.round(diff / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale === "de" ? "de-CH" : "en-GB", { numeric: "auto" });
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return rtf.format(-days, "day");
  return formatDate(d, locale);
}

/** Picks the right half of a { de, en } column. */
export function pick(value: { de: string; en: string } | null | undefined, locale: Locale): string {
  if (!value) return "";
  return value[locale] || value.de || "";
}

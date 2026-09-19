import { sql } from "drizzle-orm";
import { pgEnum, timestamp, uuid } from "drizzle-orm/pg-core";

/** Text that exists in both site languages. German is the source language. */
export type Localized = { de: string; en: string };

export const id = () =>
  uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`);

export const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const deletedAt = () => timestamp("deleted_at", { withTimezone: true });

export const currencyEnum = pgEnum("currency", ["CHF", "EUR"]);
export type Currency = (typeof currencyEnum.enumValues)[number];

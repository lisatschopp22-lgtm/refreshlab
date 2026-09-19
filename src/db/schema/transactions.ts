import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, currencyEnum, id, updatedAt } from "./common";
import { organisations, profiles } from "./identity";
import { listings } from "./marketplace";

export const offerStatusEnum = pgEnum("offer_status", [
  "open",
  "countered",
  "accepted",
  "rejected",
  "expired",
  "withdrawn",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "disputed",
  "refunded",
]);

export const paymentMethodEnum = pgEnum("payment_method", ["card", "bank_transfer", "invoice"]);

export const offers = pgTable(
  "offers",
  {
    id: id(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id"),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    currency: currencyEnum("currency").notNull().default("CHF"),
    message: text("message"),
    status: offerStatusEnum("status").notNull().default("open"),
    /** Set when this offer is a counter to another one. */
    parentOfferId: uuid("parent_offer_id"),
    /** Who has to act next. */
    createdByRole: text("created_by_role").notNull().default("buyer"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("offers_listing_idx").on(t.listingId),
    index("offers_buyer_idx").on(t.buyerId),
    index("offers_seller_idx").on(t.sellerId),
    index("offers_status_idx").on(t.status),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: id(),
    reference: text("reference").notNull(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "restrict" }),
    offerId: uuid("offer_id").references(() => offers.id, { onDelete: "set null" }),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    sellerOrgId: uuid("seller_org_id").references(() => organisations.id, { onDelete: "set null" }),
    amountCents: integer("amount_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull().default(0),
    feeCents: integer("fee_cents").notNull(),
    currency: currencyEnum("currency").notNull().default("CHF"),
    status: orderStatusEnum("status").notNull().default("pending_payment"),
    paymentMethod: paymentMethodEnum("payment_method"),
    paymentProvider: text("payment_provider").notNull().default("fake"),
    providerRef: text("provider_ref"),
    shippingAddress: jsonb("shipping_address").$type<Record<string, string>>(),
    trackingReference: text("tracking_reference"),
    disputeReason: text("dispute_reason"),
    disputeOpenedAt: timestamp("dispute_opened_at", { withTimezone: true }),
    disputeResolution: text("dispute_resolution"),
    refundedCents: integer("refunded_cents").notNull().default(0),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    payoutReleasedAt: timestamp("payout_released_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("orders_reference_idx").on(t.reference),
    index("orders_buyer_idx").on(t.buyerId),
    index("orders_seller_idx").on(t.sellerId),
    index("orders_status_idx").on(t.status),
    index("orders_listing_idx").on(t.listingId),
  ],
);

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("payment_events_idempotency_idx").on(t.idempotencyKey),
    index("payment_events_order_idx").on(t.orderId),
  ],
);

export const sellerAccounts = pgTable(
  "seller_accounts",
  {
    id: id(),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
    organisationId: uuid("organisation_id").references(() => organisations.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("fake"),
    providerAccountId: text("provider_account_id"),
    onboardingStatus: text("onboarding_status").notNull().default("not_started"),
    payoutDetails: jsonb("payout_details").$type<Record<string, string>>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("seller_accounts_profile_idx").on(t.profileId)],
);

export const offersRelations = relations(offers, ({ one }) => ({
  listing: one(listings, { fields: [offers.listingId], references: [listings.id] }),
  buyer: one(profiles, { fields: [offers.buyerId], references: [profiles.id] }),
  seller: one(profiles, { fields: [offers.sellerId], references: [profiles.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  listing: one(listings, { fields: [orders.listingId], references: [listings.id] }),
  buyer: one(profiles, { fields: [orders.buyerId], references: [profiles.id] }),
  seller: one(profiles, { fields: [orders.sellerId], references: [profiles.id] }),
  events: many(paymentEvents),
}));

export const paymentEventsRelations = relations(paymentEvents, ({ one }) => ({
  order: one(orders, { fields: [paymentEvents.orderId], references: [orders.id] }),
}));

export type Offer = typeof offers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type PaymentEvent = typeof paymentEvents.$inferSelect;
export type SellerAccount = typeof sellerAccounts.$inferSelect;

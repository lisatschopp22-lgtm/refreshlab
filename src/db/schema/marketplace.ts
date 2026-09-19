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
import { createdAt, currencyEnum, deletedAt, id, updatedAt } from "./common";
import { equipmentModels } from "./catalogue";
import { organisations, profiles } from "./identity";

export const conditionEnum = pgEnum("listing_condition", [
  "new",
  "like_new",
  "good",
  "fair",
  "for_parts",
]);
export const listingStatusEnum = pgEnum("listing_status", [
  "draft",
  "pending_review",
  "active",
  "reserved",
  "sold",
  "withdrawn",
]);
export const saleModeEnum = pgEnum("sale_mode", ["fixed", "offer", "both"]);
export const attachmentKindEnum = pgEnum("attachment_kind", [
  "manual",
  "certificate",
  "service_report",
  "decontamination",
  "other",
]);

export const listings = pgTable(
  "listings",
  {
    id: id(),
    reference: text("reference").notNull(),
    sellerProfileId: uuid("seller_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    sellerOrgId: uuid("seller_org_id").references(() => organisations.id, { onDelete: "set null" }),
    modelId: uuid("model_id")
      .notNull()
      .references(() => equipmentModels.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    scopeOfDelivery: text("scope_of_delivery"),
    condition: conditionEnum("condition").notNull(),
    conditionNotes: text("condition_notes"),
    year: integer("year"),
    operatingHours: integer("operating_hours"),
    serialSuffix: text("serial_suffix"),
    priceCents: integer("price_cents").notNull(),
    currency: currencyEnum("currency").notNull().default("CHF"),
    minPriceCents: integer("min_price_cents"),
    negotiable: saleModeEnum("sale_mode").notNull().default("both"),
    quantity: integer("quantity").notNull().default(1),
    locationCity: text("location_city").notNull(),
    locationCountry: text("location_country").notNull().default("CH"),
    warrantyMonths: integer("warranty_months").notNull().default(0),
    status: listingStatusEnum("status").notNull().default("draft"),
    inspectedAt: timestamp("inspected_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    featuredUntil: timestamp("featured_until", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    viewCount: integer("view_count").notNull().default(0),
    /** Denormalised haystack maintained by a trigger; feeds search_vector. */
    searchText: text("search_text").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
    deletedBy: uuid("deleted_by").references(() => profiles.id, { onDelete: "set null" }),
  },
  (t) => [
    uniqueIndex("listings_slug_idx").on(t.slug),
    uniqueIndex("listings_reference_idx").on(t.reference),
    index("listings_status_idx").on(t.status),
    index("listings_model_idx").on(t.modelId),
    index("listings_seller_idx").on(t.sellerProfileId),
    index("listings_org_idx").on(t.sellerOrgId),
    index("listings_price_idx").on(t.priceCents),
    index("listings_published_idx").on(t.publishedAt),
  ],
);

export const listingImages = pgTable(
  "listing_images",
  {
    id: id(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    alt: text("alt").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("listing_images_listing_idx").on(t.listingId, t.sortOrder)],
);

export const listingAttachments = pgTable(
  "listing_attachments",
  {
    id: id(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    filename: text("filename").notNull(),
    kind: attachmentKindEnum("kind").notNull().default("other"),
    createdAt: createdAt(),
  },
  (t) => [index("listing_attachments_listing_idx").on(t.listingId)],
);

export const watchlist = pgTable(
  "watchlist",
  {
    id: id(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("watchlist_unique").on(t.profileId, t.listingId)],
);

export type SavedSearchQuery = {
  q?: string;
  category?: string;
  manufacturer?: string;
  condition?: string[];
  country?: string[];
  minPrice?: number;
  maxPrice?: number;
  verified?: boolean;
};

export const savedSearches = pgTable(
  "saved_searches",
  {
    id: id(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    query: jsonb("query").$type<SavedSearchQuery>().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index("saved_searches_profile_idx").on(t.profileId)],
);

export const listingsRelations = relations(listings, ({ one, many }) => ({
  model: one(equipmentModels, { fields: [listings.modelId], references: [equipmentModels.id] }),
  seller: one(profiles, { fields: [listings.sellerProfileId], references: [profiles.id] }),
  organisation: one(organisations, { fields: [listings.sellerOrgId], references: [organisations.id] }),
  images: many(listingImages),
  attachments: many(listingAttachments),
}));

export const listingImagesRelations = relations(listingImages, ({ one }) => ({
  listing: one(listings, { fields: [listingImages.listingId], references: [listings.id] }),
}));

export const listingAttachmentsRelations = relations(listingAttachments, ({ one }) => ({
  listing: one(listings, { fields: [listingAttachments.listingId], references: [listings.id] }),
}));

export type Listing = typeof listings.$inferSelect;
export type ListingImage = typeof listingImages.$inferSelect;
export type ListingAttachment = typeof listingAttachments.$inferSelect;
export type SavedSearch = typeof savedSearches.$inferSelect;

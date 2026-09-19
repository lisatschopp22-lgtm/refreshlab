import { relations } from "drizzle-orm";
import {
  boolean,
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
import { createdAt, id, updatedAt, type Localized } from "./common";
import { profiles } from "./identity";

export const modelStatusEnum = pgEnum("model_status", ["pending", "published", "merged"]);

/** One spec field of a category, e.g. { key: "max_rcf", unit: "× g", type: "number" }. */
export type SpecField = {
  key: string;
  label: Localized;
  type: "number" | "text" | "boolean";
  unit?: string;
  facet?: boolean;
};

export const manufacturers = pgTable(
  "manufacturers",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    country: text("country"),
    website: text("website"),
    about: jsonb("about").$type<Localized>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("manufacturers_slug_idx").on(t.slug)],
);

export const categories = pgTable(
  "categories",
  {
    id: id(),
    parentId: uuid("parent_id"),
    name: jsonb("name").$type<Localized>().notNull(),
    intro: jsonb("intro").$type<Localized>(),
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    icon: text("icon"),
    specSchema: jsonb("spec_schema").$type<SpecField[]>().notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("categories_slug_idx").on(t.slug), index("categories_parent_idx").on(t.parentId)],
);

export const equipmentModels = pgTable(
  "equipment_models",
  {
    id: id(),
    /** Human-readable record number shown in the UI (S3), e.g. RL-EQ-004281. */
    recordNumber: text("record_number").notNull(),
    revision: integer("revision").notNull().default(1),
    manufacturerId: uuid("manufacturer_id")
      .notNull()
      .references(() => manufacturers.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    summary: jsonb("summary").$type<Localized>(),
    description: jsonb("description").$type<Localized>(),
    specs: jsonb("specs").$type<Record<string, string | number | boolean>>().notNull().default({}),
    accessories: text("accessories").array().notNull().default([]),
    imagePath: text("image_path"),
    yearIntroduced: integer("year_introduced"),
    discontinued: boolean("discontinued").notNull().default(false),
    successorModelId: uuid("successor_model_id"),
    manufacturerVerifiedAt: timestamp("manufacturer_verified_at", { withTimezone: true }),
    status: modelStatusEnum("status").notNull().default("published"),
    mergedIntoId: uuid("merged_into_id"),
    proposedBy: uuid("proposed_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("equipment_models_slug_idx").on(t.slug),
    uniqueIndex("equipment_models_record_idx").on(t.recordNumber),
    index("equipment_models_manufacturer_idx").on(t.manufacturerId),
    index("equipment_models_category_idx").on(t.categoryId),
    index("equipment_models_status_idx").on(t.status),
  ],
);

export const manufacturersRelations = relations(manufacturers, ({ many }) => ({
  models: many(equipmentModels),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, { fields: [categories.parentId], references: [categories.id], relationName: "parent" }),
  children: many(categories, { relationName: "parent" }),
  models: many(equipmentModels),
}));

export const equipmentModelsRelations = relations(equipmentModels, ({ one }) => ({
  manufacturer: one(manufacturers, {
    fields: [equipmentModels.manufacturerId],
    references: [manufacturers.id],
  }),
  category: one(categories, {
    fields: [equipmentModels.categoryId],
    references: [categories.id],
  }),
}));

export type Manufacturer = typeof manufacturers.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type EquipmentModel = typeof equipmentModels.$inferSelect;

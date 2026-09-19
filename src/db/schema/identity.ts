import { relations } from "drizzle-orm";
import { boolean, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./common";

export const profileRoleEnum = pgEnum("profile_role", ["user", "admin"]);
export const orgTypeEnum = pgEnum("organisation_type", [
  "lab",
  "university",
  "company",
  "dealer",
  "service_provider",
]);
export const orgMemberRoleEnum = pgEnum("organisation_member_role", ["owner", "member"]);

/**
 * Mirrors auth.users. The row is created by a trigger (see post-migrate.sql),
 * so application code never inserts here directly.
 */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    role: profileRoleEnum("role").notNull().default("user"),
    locale: text("locale").notNull().default("de"),
    avatarPath: text("avatar_path"),
    bio: text("bio"),
    city: text("city"),
    country: text("country"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendedReason: text("suspended_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("profiles_role_idx").on(t.role)],
);

export const organisations = pgTable(
  "organisations",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    type: orgTypeEnum("type").notNull().default("lab"),
    about: text("about"),
    website: text("website"),
    city: text("city"),
    country: text("country").notNull().default("CH"),
    logoPath: text("logo_path"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    /** Free-form trust claims shown on the public profile (S18). */
    verifications: text("verifications").array().notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("organisations_slug_idx").on(t.slug)],
);

export const organisationMembers = pgTable(
  "organisation_members",
  {
    id: id(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: orgMemberRoleEnum("role").notNull().default("member"),
    canPublish: boolean("can_publish").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("organisation_members_unique").on(t.organisationId, t.profileId)],
);

export const profilesRelations = relations(profiles, ({ many }) => ({
  memberships: many(organisationMembers),
}));

export const organisationsRelations = relations(organisations, ({ many }) => ({
  members: many(organisationMembers),
}));

export const organisationMembersRelations = relations(organisationMembers, ({ one }) => ({
  organisation: one(organisations, {
    fields: [organisationMembers.organisationId],
    references: [organisations.id],
  }),
  profile: one(profiles, {
    fields: [organisationMembers.profileId],
    references: [profiles.id],
  }),
}));

export type Profile = typeof profiles.$inferSelect;
export type Organisation = typeof organisations.$inferSelect;
export type OrganisationMember = typeof organisationMembers.$inferSelect;

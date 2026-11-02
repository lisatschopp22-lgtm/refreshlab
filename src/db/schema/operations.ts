import {
  boolean,
  index,
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

export const reportTargetEnum = pgEnum("report_target", ["listing", "comment", "message", "user"]);
export const reportStatusEnum = pgEnum("report_status", ["open", "resolved", "dismissed"]);

export const reports = pgTable(
  "reports",
  {
    id: id(),
    reporterId: uuid("reporter_id").references(() => profiles.id, { onDelete: "set null" }),
    targetType: reportTargetEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    reason: text("reason").notNull(),
    detail: text("detail"),
    /** 0-100, produced by the simple heuristics in domain/moderation.ts (S19). */
    riskScore: jsonb("risk_score").$type<{ score: number; signals: string[] }>(),
    status: reportStatusEnum("status").notNull().default("open"),
    resolvedBy: uuid("resolved_by").references(() => profiles.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNote: text("resolution_note"),
    createdAt: createdAt(),
  },
  (t) => [index("reports_status_idx").on(t.status), index("reports_target_idx").on(t.targetType, t.targetId)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id"),
    summary: text("summary"),
    before: jsonb("before").$type<Record<string, unknown> | null>(),
    after: jsonb("after").$type<Record<string, unknown> | null>(),
    createdAt: createdAt(),
  },
  (t) => [index("audit_log_created_idx").on(t.createdAt), index("audit_log_actor_idx").on(t.actorId)],
);

export const contentPages = pgTable(
  "content_pages",
  {
    id: id(),
    slug: text("slug").notNull(),
    title: jsonb("title").$type<Localized>().notNull(),
    body: jsonb("body").$type<Localized>().notNull(),
    published: boolean("published").notNull().default(true),
    showInFooter: boolean("show_in_footer").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("content_pages_slug_idx").on(t.slug)],
);

/**
 * Transactional outbox. Everything that must happen after a write but not
 * inside the request (search re-index, notification mail) lands here and is
 * drained by /api/jobs/run.
 */
export const outbox = pgTable(
  "outbox",
  {
    id: id(),
    topic: text("topic").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    attempts: jsonb("attempts").$type<{ count: number; lastError?: string }>().notNull().default({ count: 0 }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("outbox_pending_idx").on(t.processedAt, t.createdAt)],
);

/** Single-row-per-key settings edited in the admin area. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: updatedAt(),
  updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
});

export type Report = typeof reports.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;
export type ContentPage = typeof contentPages.$inferSelect;
export type OutboxEntry = typeof outbox.$inferSelect;

export const serviceKindEnum = pgEnum("service_kind", ["lab_clearance", "maintenance", "chemicals"]);
export const serviceStatusEnum = pgEnum("service_status", ["open", "in_progress", "done", "declined"]);

/**
 * What refreshLab arranges rather than lists: clearing a lab, servicing an
 * instrument, passing on unopened surplus chemicals. Anyone may ask, signed
 * in or not; an admin follows each request up. What differs per kind sits in
 * `details`.
 */
export const serviceRequests = pgTable(
  "service_requests",
  {
    id: id(),
    kind: serviceKindEnum("kind").notNull(),
    status: serviceStatusEnum("status").notNull().default("open"),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    contactName: text("contact_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    organisationName: text("organisation_name"),
    location: text("location"),
    message: text("message"),
    details: jsonb("details").$type<Record<string, string>>().notNull().default({}),
    adminNote: text("admin_note"),
    handledBy: uuid("handled_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("service_requests_status_idx").on(t.status, t.kind)],
);

export type ServiceRequest = typeof serviceRequests.$inferSelect;

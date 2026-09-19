import { relations } from "drizzle-orm";
import { index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, deletedAt, id, updatedAt } from "./common";
import { profiles } from "./identity";
import { listings } from "./marketplace";

export const commentTargetEnum = pgEnum("comment_target", ["model", "listing"]);
export const commentStatusEnum = pgEnum("comment_status", ["visible", "hidden"]);

export const comments = pgTable(
  "comments",
  {
    id: id(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    targetType: commentTargetEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    parentId: uuid("parent_id"),
    body: text("body").notNull(),
    status: commentStatusEnum("status").notNull().default("visible"),
    hiddenReason: text("hidden_reason"),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
    deletedBy: uuid("deleted_by").references(() => profiles.id, { onDelete: "set null" }),
  },
  (t) => [
    index("comments_target_idx").on(t.targetType, t.targetId),
    index("comments_author_idx").on(t.authorId),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: id(),
    listingId: uuid("listing_id").references(() => listings.id, { onDelete: "set null" }),
    subject: text("subject"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index("conversations_last_message_idx").on(t.lastMessageAt)],
);

export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    id: id(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("conversation_participants_unique").on(t.conversationId, t.profileId)],
);

export type MessageAttachment = { path: string; filename: string };

export const messages = pgTable(
  "messages",
  {
    id: id(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    attachments: jsonb("attachments").$type<MessageAttachment[]>().notNull().default([]),
    /** Set when the message is the system note for an offer event. */
    offerId: uuid("offer_id"),
    createdAt: createdAt(),
    deletedAt: deletedAt(),
    deletedBy: uuid("deleted_by").references(() => profiles.id, { onDelete: "set null" }),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)],
);

export const blocks = pgTable(
  "blocks",
  {
    id: id(),
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("blocks_unique").on(t.blockerId, t.blockedId)],
);

export const commentsRelations = relations(comments, ({ one }) => ({
  author: one(profiles, { fields: [comments.authorId], references: [profiles.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  listing: one(listings, { fields: [conversations.listingId], references: [listings.id] }),
  participants: many(conversationParticipants),
  messages: many(messages),
}));

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationParticipants.conversationId],
    references: [conversations.id],
  }),
  profile: one(profiles, { fields: [conversationParticipants.profileId], references: [profiles.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  sender: one(profiles, { fields: [messages.senderId], references: [profiles.id] }),
}));

export type Comment = typeof comments.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;

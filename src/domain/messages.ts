import { and, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  blocks,
  conversationParticipants,
  conversations,
  messages,
  type MessageAttachment,
} from "@/db/schema/community";
import { profiles } from "@/db/schema/identity";
import { listings } from "@/db/schema/marketplace";
import type { SessionUser } from "@/auth/session";
import { assert, canReadConversation, isAdmin } from "./permissions";
import { enqueue } from "./audit";

/** Cheap anti-spam: a person may send this many messages per minute. */
const RATE_LIMIT_PER_MINUTE = 10;

export class MessageError extends Error {}

export async function participantsOf(conversationId: string) {
  const rows = await db
    .select({ profileId: conversationParticipants.profileId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, conversationId));
  return rows.map((row) => row.profileId);
}

export async function isBlockedBetween(a: string, b: string) {
  const [row] = await db
    .select({ id: blocks.id })
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerId, a), eq(blocks.blockedId, b)),
        and(eq(blocks.blockerId, b), eq(blocks.blockedId, a)),
      ),
    )
    .limit(1);
  return !!row;
}

async function assertUnderRateLimit(userId: string) {
  const since = new Date(Date.now() - 60_000);
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(messages)
    .where(and(eq(messages.senderId, userId), gte(messages.createdAt, since)));
  if (Number(row?.value ?? 0) >= RATE_LIMIT_PER_MINUTE) {
    throw new MessageError("rate_limited");
  }
}

/** Opens the existing thread about a listing rather than starting a second one. */
export async function openConversation(user: SessionUser, listingId: string) {
  const [listing] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, listingId), isNull(listings.deletedAt)))
    .limit(1);
  assert(!!listing, "Listing not found");

  const sellerId = listing!.sellerProfileId;
  if (sellerId === user.id) throw new MessageError("self");
  if (await isBlockedBetween(user.id, sellerId)) throw new MessageError("blocked");

  const [existing] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .innerJoin(
      conversationParticipants,
      and(
        eq(conversationParticipants.conversationId, conversations.id),
        eq(conversationParticipants.profileId, user.id),
      ),
    )
    .where(eq(conversations.listingId, listingId))
    .limit(1);
  if (existing) return existing.id;

  const [conversation] = await db
    .insert(conversations)
    .values({ listingId, subject: listing!.title, createdBy: user.id })
    .returning({ id: conversations.id });

  await db.insert(conversationParticipants).values([
    { conversationId: conversation!.id, profileId: user.id, lastReadAt: new Date() },
    { conversationId: conversation!.id, profileId: sellerId },
  ]);

  return conversation!.id;
}

export async function sendMessage(
  user: SessionUser,
  conversationId: string,
  body: string,
  attachments: MessageAttachment[] = [],
  offerId?: string,
) {
  const participants = await participantsOf(conversationId);
  assert(canReadConversation(user, participants), "Not a participant");

  const other = participants.find((id) => id !== user.id);
  if (other && (await isBlockedBetween(user.id, other))) throw new MessageError("blocked");

  const trimmed = body.trim();
  if (!trimmed && attachments.length === 0) throw new MessageError("empty");
  if (trimmed.length > 4000) throw new MessageError("too_long");
  await assertUnderRateLimit(user.id);

  const [row] = await db
    .insert(messages)
    .values({ conversationId, senderId: user.id, body: trimmed, attachments, offerId })
    .returning();

  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, conversationId));
  await db
    .update(conversationParticipants)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.profileId, user.id),
      ),
    );

  await enqueue("message.sent", { messageId: row!.id });
  return row!;
}

export async function threadFor(user: SessionUser, conversationId: string) {
  const participants = await participantsOf(conversationId);
  assert(canReadConversation(user, participants), "Not a participant");

  const [conversation] = await db
    .select({
      id: conversations.id,
      subject: conversations.subject,
      listingId: conversations.listingId,
      listingSlug: listings.slug,
      listingTitle: listings.title,
      listingPrice: listings.priceCents,
      listingCurrency: listings.currency,
      listingStatus: listings.status,
    })
    .from(conversations)
    .leftJoin(listings, eq(listings.id, conversations.listingId))
    .where(eq(conversations.id, conversationId))
    .limit(1);

  const rows = await db
    .select({
      id: messages.id,
      body: messages.body,
      attachments: messages.attachments,
      createdAt: messages.createdAt,
      deletedAt: messages.deletedAt,
      offerId: messages.offerId,
      senderId: messages.senderId,
      senderName: profiles.displayName,
      senderAvatar: profiles.avatarPath,
    })
    .from(messages)
    .innerJoin(profiles, eq(profiles.id, messages.senderId))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  const counterpartIds = participants.filter((id) => id !== user.id);
  const counterpart = counterpartIds.length
    ? (
        await db
          .select({
            id: profiles.id,
            displayName: profiles.displayName,
            verifiedAt: profiles.verifiedAt,
            city: profiles.city,
          })
          .from(profiles)
          .where(inArray(profiles.id, counterpartIds))
          .limit(1)
      )[0]
    : undefined;

  const blocked = counterpart ? await isBlockedBetween(user.id, counterpart.id) : false;

  return { conversation, messages: rows, counterpart, blocked };
}

export async function markRead(user: SessionUser, conversationId: string) {
  await db
    .update(conversationParticipants)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.profileId, user.id),
      ),
    );
}

export async function blockUser(user: SessionUser, blockedId: string) {
  if (blockedId === user.id) throw new MessageError("self");
  await db
    .insert(blocks)
    .values({ blockerId: user.id, blockedId })
    .onConflictDoNothing();
}

export async function unblockUser(user: SessionUser, blockedId: string) {
  await db
    .delete(blocks)
    .where(and(eq(blocks.blockerId, user.id), eq(blocks.blockedId, blockedId)));
}

export async function deleteMessage(user: SessionUser, messageId: string) {
  const [row] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  assert(!!row, "Not found");
  assert(row!.senderId === user.id || isAdmin(user), "Not your message");
  await db
    .update(messages)
    .set({ deletedAt: new Date(), deletedBy: user.id })
    .where(eq(messages.id, messageId));
}

export async function latestMessageAt(conversationId: string) {
  const [row] = await db
    .select({ at: messages.createdAt })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(1);
  return row?.at ?? null;
}

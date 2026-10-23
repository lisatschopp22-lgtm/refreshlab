import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { watchLists, watchlist } from "@/db/schema/marketplace";
import { qualified } from "@/db/queries/sql-helpers";
import type { SessionUser } from "@/auth/session";
import { assert, canEditWatchList } from "./permissions";

/**
 * Saved listings, in as many named lists as a person likes ("Merklisten").
 * A single click on the heart saves to the oldest list, which is created on
 * the first save and shows as "Merkliste" until it is renamed.
 */
export const MAX_LISTS = 30;
export const MAX_LIST_NAME = 60;

export class WatchListError extends Error {}

function cleanName(name: string) {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > MAX_LIST_NAME) throw new WatchListError("invalid_name");
  return trimmed;
}

/** The person's lists, oldest first, with how many listings each holds. */
export async function listsOf(userId: string) {
  return db
    .select({
      id: watchLists.id,
      name: watchLists.name,
      createdAt: watchLists.createdAt,
      count: sql<number>`(select count(*)::int from watchlist where watchlist.list_id = ${qualified("watch_lists.id")})`,
    })
    .from(watchLists)
    .where(and(eq(watchLists.profileId, userId), isNull(watchLists.deletedAt)))
    .orderBy(asc(watchLists.createdAt));
}

/** Which of the person's lists hold this listing. */
export async function listsHolding(userId: string, listingId: string) {
  const rows = await db
    .select({ listId: watchlist.listId })
    .from(watchlist)
    .where(and(eq(watchlist.profileId, userId), eq(watchlist.listingId, listingId)));
  return rows.map((row) => row.listId);
}

async function ownList(user: SessionUser, listId: string) {
  const [list] = await db
    .select()
    .from(watchLists)
    .where(and(eq(watchLists.id, listId), isNull(watchLists.deletedAt)))
    .limit(1);
  assert(!!list && canEditWatchList(user, list), "Not your list");
  return list!;
}

/** The list a single click saves to: the oldest one, created when needed. */
async function firstList(user: SessionUser) {
  const [first] = await db
    .select()
    .from(watchLists)
    .where(and(eq(watchLists.profileId, user.id), isNull(watchLists.deletedAt)))
    .orderBy(asc(watchLists.createdAt))
    .limit(1);
  if (first) return first;
  const [created] = await db.insert(watchLists).values({ profileId: user.id }).returning();
  return created!;
}

export async function createList(user: SessionUser, name: string) {
  const lists = await listsOf(user.id);
  if (lists.length >= MAX_LISTS) throw new WatchListError("too_many");
  const [created] = await db.insert(watchLists).values({ profileId: user.id, name: cleanName(name) }).returning();
  return created!;
}

export async function renameList(user: SessionUser, listId: string, name: string) {
  await ownList(user, listId);
  await db
    .update(watchLists)
    .set({ name: cleanName(name), updatedAt: new Date() })
    .where(eq(watchLists.id, listId));
}

/** The list itself is kept as deleted; what was saved in it is simply no longer saved there. */
export async function deleteList(user: SessionUser, listId: string) {
  await ownList(user, listId);
  await db.transaction(async (tx) => {
    await tx.delete(watchlist).where(eq(watchlist.listId, listId));
    await tx.update(watchLists).set({ deletedAt: new Date() }).where(eq(watchLists.id, listId));
  });
}

/** Saves to the given list, or to the first one. */
export async function addToList(user: SessionUser, listingId: string, listId?: string) {
  const list = listId ? await ownList(user, listId) : await firstList(user);
  await db.insert(watchlist).values({ profileId: user.id, listId: list.id, listingId }).onConflictDoNothing();
  return list;
}

export async function removeFromList(user: SessionUser, listingId: string, listId: string) {
  await ownList(user, listId);
  await db.delete(watchlist).where(and(eq(watchlist.listId, listId), eq(watchlist.listingId, listingId)));
}

/** In the list or out of it, whichever it is not. An empty list id means the first list. */
export async function toggleInList(user: SessionUser, listingId: string, listId?: string) {
  const list = listId ? await ownList(user, listId) : await firstList(user);
  const holding = await listsHolding(user.id, listingId);
  if (holding.includes(list.id)) await removeFromList(user, listingId, list.id);
  else await addToList(user, listingId, list.id);
}

/** The heart: saves to the first list, or, when saved anywhere, takes it out of every list. */
export async function toggleSaved(user: SessionUser, listingId: string) {
  const holding = await listsHolding(user.id, listingId);
  if (holding.length) {
    await db.delete(watchlist).where(and(eq(watchlist.profileId, user.id), eq(watchlist.listingId, listingId)));
    return false;
  }
  await addToList(user, listingId);
  return true;
}

export async function moveToList(user: SessionUser, listingId: string, fromListId: string, toListId: string) {
  await ownList(user, fromListId);
  await ownList(user, toListId);
  if (fromListId === toListId) return;
  await db.transaction(async (tx) => {
    await tx.insert(watchlist).values({ profileId: user.id, listId: toListId, listingId }).onConflictDoNothing();
    await tx.delete(watchlist).where(and(eq(watchlist.listId, fromListId), eq(watchlist.listingId, listingId)));
  });
}

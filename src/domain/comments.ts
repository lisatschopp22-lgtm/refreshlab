import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { comments } from "@/db/schema/community";
import { profiles } from "@/db/schema/identity";
import { listings } from "@/db/schema/marketplace";
import type { SessionUser } from "@/auth/session";
import { assert, canEditComment, isAdmin } from "./permissions";
import { recordAudit } from "./audit";

export type CommentTarget = "model" | "listing";

export type CommentNode = {
  id: string;
  body: string;
  status: "visible" | "hidden";
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorVerified: boolean;
  isSeller: boolean;
  replies: CommentNode[];
};

/**
 * One level of nesting only. Deep threads make a technical Q&A harder to scan,
 * and the mockups (S5) show a flat question-and-answer shape.
 */
export async function listComments(
  targetType: CommentTarget,
  targetId: string,
  sellerId?: string | null,
): Promise<CommentNode[]> {
  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      status: comments.status,
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      editedAt: comments.editedAt,
      deletedAt: comments.deletedAt,
      authorId: profiles.id,
      authorName: profiles.displayName,
      authorAvatar: profiles.avatarPath,
      authorVerified: profiles.verifiedAt,
    })
    .from(comments)
    .innerJoin(profiles, eq(profiles.id, comments.authorId))
    .where(and(eq(comments.targetType, targetType), eq(comments.targetId, targetId)))
    .orderBy(asc(comments.createdAt));

  const toNode = (row: (typeof rows)[number]): CommentNode => ({
    id: row.id,
    body: row.body,
    status: row.status,
    createdAt: row.createdAt,
    editedAt: row.editedAt,
    deletedAt: row.deletedAt,
    authorId: row.authorId,
    authorName: row.authorName,
    authorAvatar: row.authorAvatar,
    authorVerified: !!row.authorVerified,
    isSeller: !!sellerId && row.authorId === sellerId,
    replies: [],
  });

  const byId = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];
  for (const row of rows) byId.set(row.id, toNode(row));
  for (const row of rows) {
    const node = byId.get(row.id)!;
    if (row.parentId && byId.has(row.parentId)) byId.get(row.parentId)!.replies.push(node);
    else roots.push(node);
  }
  return roots;
}

export async function addComment(
  user: SessionUser,
  input: { targetType: CommentTarget; targetId: string; parentId?: string | null; body: string },
) {
  assert(!user.suspendedAt, "Suspended");
  const body = input.body.trim();
  assert(body.length >= 2 && body.length <= 4000, "Body length");

  // Replies stay one level deep: a reply to a reply attaches to its root.
  let parentId = input.parentId ?? null;
  if (parentId) {
    const [parent] = await db.select().from(comments).where(eq(comments.id, parentId)).limit(1);
    assert(!!parent, "Parent not found");
    parentId = parent!.parentId ?? parent!.id;
  }

  const [row] = await db
    .insert(comments)
    .values({
      authorId: user.id,
      targetType: input.targetType,
      targetId: input.targetId,
      parentId,
      body,
    })
    .returning();
  return row!;
}

export async function editComment(user: SessionUser, commentId: string, body: string) {
  const [existing] = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
  assert(!!existing, "Not found");
  assert(canEditComment(user, existing!), "Not your comment");

  const [row] = await db
    .update(comments)
    .set({ body: body.trim(), editedAt: new Date() })
    .where(eq(comments.id, commentId))
    .returning();

  if (isAdmin(user) && existing!.authorId !== user.id) {
    await recordAudit({
      actorId: user.id,
      action: "comment.edited",
      targetType: "comment",
      targetId: commentId,
      before: { body: existing!.body },
      after: { body: row!.body },
    });
  }
  return row!;
}

export async function deleteComment(user: SessionUser, commentId: string) {
  const [existing] = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
  assert(!!existing, "Not found");
  assert(canEditComment(user, existing!), "Not your comment");

  await db
    .update(comments)
    .set({ deletedAt: new Date(), deletedBy: user.id })
    .where(eq(comments.id, commentId));

  await recordAudit({
    actorId: user.id,
    action: "comment.deleted",
    targetType: "comment",
    targetId: commentId,
    summary: existing!.body.slice(0, 120),
  });
}

/** Moderation: hiding keeps the row, so the decision stays reviewable. */
export async function setCommentStatus(
  user: SessionUser,
  commentId: string,
  status: "visible" | "hidden",
  reason?: string,
) {
  assert(isAdmin(user), "Admin only");
  const [before] = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
  const [row] = await db
    .update(comments)
    .set({ status, hiddenReason: status === "hidden" ? (reason ?? null) : null })
    .where(eq(comments.id, commentId))
    .returning();
  await recordAudit({
    actorId: user.id,
    action: `comment.${status}`,
    targetType: "comment",
    targetId: commentId,
    summary: reason,
    before: { status: before?.status },
    after: { status },
  });
  return row!;
}

export async function listingSellerId(listingId: string) {
  const [row] = await db
    .select({ sellerId: listings.sellerProfileId })
    .from(listings)
    .where(and(eq(listings.id, listingId), isNull(listings.deletedAt)))
    .limit(1);
  return row?.sellerId ?? null;
}

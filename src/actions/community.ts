"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentUser, requireUser } from "@/auth/session";
import {
  addComment,
  deleteComment,
  editComment,
  type CommentTarget,
} from "@/domain/comments";
import {
  blockUser,
  MessageError,
  openConversation,
  sendMessage,
  unblockUser,
} from "@/domain/messages";
import { fileReport, reportReasons, type ReportReason, type ReportTarget } from "@/domain/moderation";
import { uploadAttachment, UploadError } from "@/integrations/storage";

export type CommunityState = { error?: string; ok?: boolean };

export async function addCommentAction(
  _prev: CommunityState,
  formData: FormData,
): Promise<CommunityState> {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);

  const parsed = z
    .object({
      targetType: z.enum(["model", "listing"]),
      targetId: z.uuid(),
      parentId: z.uuid().optional(),
      body: z.string().min(2).max(4000),
    })
    .safeParse({
      targetType: formData.get("targetType"),
      targetId: formData.get("targetId"),
      parentId: formData.get("parentId") || undefined,
      body: formData.get("body"),
    });
  if (!parsed.success) return { error: "invalid" };

  await addComment(user, {
    targetType: parsed.data.targetType as CommentTarget,
    targetId: parsed.data.targetId,
    parentId: parsed.data.parentId ?? null,
    body: parsed.data.body,
  });

  revalidatePath(String(formData.get("path") ?? "/"), "page");
  return { ok: true };
}

export async function editCommentAction(
  _prev: CommunityState,
  formData: FormData,
): Promise<CommunityState> {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);
  const body = String(formData.get("body") ?? "");
  if (body.trim().length < 2) return { error: "invalid" };

  await editComment(user, String(formData.get("commentId")), body);
  revalidatePath(String(formData.get("path") ?? "/"), "page");
  return { ok: true };
}

export async function deleteCommentAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);
  await deleteComment(user, String(formData.get("commentId")));
  revalidatePath(String(formData.get("path") ?? "/"), "page");
}

export async function reportAction(_prev: CommunityState, formData: FormData): Promise<CommunityState> {
  const user = await currentUser();
  const parsed = z
    .object({
      targetType: z.enum(["listing", "comment", "message", "user"]),
      targetId: z.uuid(),
      reason: z.enum(reportReasons),
      detail: z.string().max(2000).optional(),
    })
    .safeParse({
      targetType: formData.get("targetType"),
      targetId: formData.get("targetId"),
      reason: formData.get("reason"),
      detail: formData.get("detail") || undefined,
    });
  if (!parsed.success) return { error: "invalid" };

  await fileReport(user, {
    targetType: parsed.data.targetType as ReportTarget,
    targetId: parsed.data.targetId,
    reason: parsed.data.reason as ReportReason,
    detail: parsed.data.detail,
  });
  return { ok: true };
}

export async function startConversationAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);
  const listingId = String(formData.get("listingId") ?? "");

  try {
    const conversationId = await openConversation(user, listingId);
    redirect(`/${locale}/nachrichten/${conversationId}`);
  } catch (error) {
    if (error instanceof MessageError) redirect(`/${locale}/nachrichten?error=${error.message}`);
    throw error;
  }
}

export async function sendMessageAction(
  _prev: CommunityState,
  formData: FormData,
): Promise<CommunityState> {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);
  const conversationId = String(formData.get("conversationId") ?? "");
  const body = String(formData.get("body") ?? "");

  const attachments: { path: string; filename: string }[] = [];
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    try {
      const path = await uploadAttachment(file, `messages/${conversationId}`);
      attachments.push({ path, filename: file.name.slice(0, 160) });
    } catch (error) {
      return { error: error instanceof UploadError ? "upload" : "upload" };
    }
  }

  try {
    await sendMessage(user, conversationId, body, attachments);
  } catch (error) {
    if (error instanceof MessageError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/${locale}/nachrichten/${conversationId}`);
  return { ok: true };
}

export async function blockAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);
  const targetId = String(formData.get("profileId") ?? "");
  const intent = String(formData.get("intent") ?? "block");

  if (intent === "unblock") await unblockUser(user, targetId);
  else await blockUser(user, targetId);

  revalidatePath(`/${locale}/nachrichten`, "layout");
}

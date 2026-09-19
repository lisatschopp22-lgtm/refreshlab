"use client";

import { useActionState, useEffect, useState } from "react";
import { Flag, MessageSquare, Trash2 } from "lucide-react";
import {
  addCommentAction,
  deleteCommentAction,
  editCommentAction,
  reportAction,
  type CommunityState,
} from "@/actions/community";
import type { CommentNode } from "@/domain/comments";
import { Badge } from "./badge";
import { Button } from "./button";
import { Textarea } from "./field";
import { cn } from "./cn";

const empty: CommunityState = {};

export type CommentLabels = {
  title: string;
  placeholder: string;
  post: string;
  reply: string;
  sendReply: string;
  sellerBadge: string;
  expertBadge: string;
  edited: string;
  hidden: string;
  deleted: string;
  emptyTitle: string;
  emptyHint: string;
  signIn: string;
  report: string;
  submitReport: string;
  reported: string;
  replyPlaceholder: string;
  cancel: string;
  save: string;
  edit: string;
  delete: string;
  reportReasons: { value: string; label: string }[];
};

function CommentForm({
  locale,
  path,
  targetType,
  targetId,
  parentId,
  labels,
  onDone,
  compact,
}: {
  locale: string;
  path: string;
  targetType: string;
  targetId: string;
  parentId?: string;
  labels: CommentLabels;
  onDone?: () => void;
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState<CommunityState, FormData>(addCommentAction, empty);

  // Close only once the action has reported back. Unmounting the form from
  // inside the submit handler cancels the in-flight transition, and the reply
  // is silently lost.
  useEffect(() => {
    if (state.ok) onDone?.();
  }, [state.ok, onDone]);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="path" value={path} />
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      <Textarea
        name="body"
        required
        minLength={2}
        rows={compact ? 2 : 3}
        placeholder={parentId ? labels.replyPlaceholder : labels.placeholder}
        aria-label={parentId ? labels.replyPlaceholder : labels.placeholder}
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {parentId ? labels.sendReply : labels.post}
        </Button>
        {onDone ? (
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            {labels.cancel}
          </Button>
        ) : null}
        {state.error ? <span className="text-sm text-danger">{state.error}</span> : null}
      </div>
    </form>
  );
}

function ReportForm({
  targetType,
  targetId,
  labels,
  onDone,
}: {
  targetType: string;
  targetId: string;
  labels: CommentLabels;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<CommunityState, FormData>(reportAction, empty);

  if (state.ok) {
    return <p className="text-xs text-success">{labels.reported}</p>;
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2 pt-1">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <select
        name="reason"
        aria-label={labels.report}
        className="h-8 rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-2 text-xs"
      >
        {labels.reportReasons.map((reason) => (
          <option key={reason.value} value={reason.value}>
            {reason.label}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {labels.submitReport}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>
        {labels.cancel}
      </Button>
    </form>
  );
}

function Comment({
  comment,
  locale,
  path,
  targetType,
  targetId,
  currentUserId,
  isAdmin,
  labels,
  depth = 0,
}: {
  comment: CommentNode;
  locale: string;
  path: string;
  targetType: string;
  targetId: string;
  currentUserId: string | null;
  isAdmin: boolean;
  labels: CommentLabels;
  depth?: number;
}) {
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [editState, editAction, editPending] = useActionState<CommunityState, FormData>(
    editCommentAction,
    empty,
  );

  const removed = !!comment.deletedAt;
  const hidden = comment.status === "hidden";
  const mine = currentUserId === comment.authorId;

  return (
    <li className={cn(depth > 0 && "ml-6 border-l border-border pl-4")}>
      <article className="py-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-fg">{comment.authorName}</span>
          {comment.isSeller ? <Badge tone="primary">{labels.sellerBadge}</Badge> : null}
          {comment.authorVerified ? <Badge tone="success">{labels.expertBadge}</Badge> : null}
          <time className="text-xs text-fg-subtle" dateTime={new Date(comment.createdAt).toISOString()}>
            {new Date(comment.createdAt).toLocaleDateString(locale === "de" ? "de-CH" : "en-GB")}
          </time>
          {comment.editedAt ? <span className="text-xs text-fg-subtle">({labels.edited})</span> : null}
        </div>

        {removed ? (
          <p className="mt-1 text-sm italic text-fg-subtle">{labels.deleted}</p>
        ) : hidden && !isAdmin ? (
          <p className="mt-1 text-sm italic text-fg-subtle">{labels.hidden}</p>
        ) : editing ? (
          <form action={editAction} className="mt-2 space-y-2">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="path" value={path} />
            <input type="hidden" name="commentId" value={comment.id} />
            <Textarea name="body" defaultValue={comment.body} rows={3} required minLength={2} />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={editPending}>
                {labels.save}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                {labels.cancel}
              </Button>
              {editState.ok ? <span className="self-center text-xs text-success">✓</span> : null}
            </div>
          </form>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">
            {hidden ? <span className="mr-1 text-xs text-warning">[{labels.hidden}]</span> : null}
            {comment.body}
          </p>
        )}

        {!removed ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
            {currentUserId && depth === 0 ? (
              <button
                type="button"
                onClick={() => setReplying((value) => !value)}
                className="inline-flex items-center gap-1 text-fg-subtle hover:text-fg"
              >
                <MessageSquare className="size-3" aria-hidden="true" />
                {labels.reply}
              </button>
            ) : null}
            {mine || isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditing((value) => !value)}
                  className="text-fg-subtle hover:text-fg"
                >
                  {labels.edit}
                </button>
                <form action={deleteCommentAction} className="inline">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="path" value={path} />
                  <input type="hidden" name="commentId" value={comment.id} />
                  <button type="submit" className="inline-flex items-center gap-1 text-fg-subtle hover:text-danger">
                    <Trash2 className="size-3" aria-hidden="true" />
                    {labels.delete}
                  </button>
                </form>
              </>
            ) : null}
            {!mine ? (
              <button
                type="button"
                onClick={() => setReporting((value) => !value)}
                className="inline-flex items-center gap-1 text-fg-subtle hover:text-danger"
              >
                <Flag className="size-3" aria-hidden="true" />
                {labels.report}
              </button>
            ) : null}
          </div>
        ) : null}

        {reporting ? (
          <ReportForm
            targetType="comment"
            targetId={comment.id}
            labels={labels}
            onDone={() => setReporting(false)}
          />
        ) : null}

        {replying ? (
          <div className="mt-3">
            <CommentForm
              locale={locale}
              path={path}
              targetType={targetType}
              targetId={targetId}
              parentId={comment.id}
              labels={labels}
              compact
              onDone={() => setReplying(false)}
            />
          </div>
        ) : null}
      </article>

      {comment.replies.length ? (
        <ul>
          {comment.replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              locale={locale}
              path={path}
              targetType={targetType}
              targetId={targetId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              labels={labels}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function CommentThread({
  comments,
  locale,
  path,
  targetType,
  targetId,
  currentUserId,
  isAdmin = false,
  signInHref,
  labels,
}: {
  comments: CommentNode[];
  locale: string;
  path: string;
  targetType: string;
  targetId: string;
  currentUserId: string | null;
  isAdmin?: boolean;
  signInHref: string;
  labels: CommentLabels;
}) {
  const visible = comments.filter((comment) => isAdmin || comment.status === "visible" || comment.deletedAt);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{labels.title}</h2>

      {currentUserId ? (
        <CommentForm
          locale={locale}
          path={path}
          targetType={targetType}
          targetId={targetId}
          labels={labels}
        />
      ) : (
        <p className="rounded-[var(--radius-md)] border border-border bg-bg-subtle px-3 py-2.5 text-sm text-fg-muted">
          <a href={signInHref} className="font-medium text-primary hover:underline">
            {labels.signIn}
          </a>
        </p>
      )}

      {visible.length ? (
        <ul className="divide-y divide-border">
          {visible.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              locale={locale}
              path={path}
              targetType={targetType}
              targetId={targetId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              labels={labels}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-fg-subtle">
          {labels.emptyTitle} {labels.emptyHint}
        </p>
      )}
    </section>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Send } from "lucide-react";
import { sendMessageAction, type CommunityState } from "@/actions/community";
import { Button } from "./button";
import { Textarea } from "./field";
import { cn } from "./cn";

const empty: CommunityState = {};

export type ThreadMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderName: string;
  attachments: { path: string; filename: string }[];
  deleted: boolean;
};

export function MessageThread({
  locale,
  conversationId,
  messages,
  currentUserId,
  blocked,
  labels,
}: {
  locale: string;
  conversationId: string;
  messages: ThreadMessage[];
  currentUserId: string;
  blocked: boolean;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<CommunityState, FormData>(sendMessageAction, empty);
  const endRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // Polling rather than Realtime: enough to judge the behaviour, and it keeps
  // the prototype free of a live subscription to reason about.
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(timer);
  }, [router]);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <div className="flex h-full flex-col">
      <ul className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => {
          const mine = message.senderId === currentUserId;
          return (
            <li key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[min(32rem,80%)] rounded-[var(--radius-lg)] px-3.5 py-2.5 text-sm",
                  mine
                    ? "bg-primary text-primary-fg"
                    : "border border-border bg-bg-elevated text-fg",
                )}
              >
                {!mine ? (
                  <p className="mb-0.5 text-xs font-medium text-fg-muted">{message.senderName}</p>
                ) : null}
                {message.deleted ? (
                  <p className="italic opacity-70">{labels.deleted}</p>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{message.body}</p>
                )}
                {message.attachments.map((attachment) => (
                  <p key={attachment.path} className="mt-1.5 flex items-center gap-1 text-xs opacity-90">
                    <Paperclip className="size-3" aria-hidden="true" />
                    {attachment.filename}
                  </p>
                ))}
                <time
                  className={cn("mt-1 block text-[0.6875rem]", mine ? "opacity-80" : "text-fg-subtle")}
                  dateTime={message.createdAt}
                >
                  {new Date(message.createdAt).toLocaleString(locale === "de" ? "de-CH" : "en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            </li>
          );
        })}
        <div ref={endRef} />
      </ul>

      <div className="border-t border-border p-3">
        {blocked ? (
          <p className="rounded-[var(--radius-md)] bg-bg-sunken px-3 py-2 text-sm text-fg-muted">
            {labels.blocked}
          </p>
        ) : (
          <form ref={formRef} action={action} className="space-y-2">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="conversationId" value={conversationId} />
            <Textarea
              name="body"
              rows={2}
              placeholder={labels.write}
              aria-label={labels.write}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                <Send className="size-3.5" aria-hidden="true" />
                {labels.send}
              </Button>
              <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-fg-subtle hover:text-fg">
                <Paperclip className="size-3.5" aria-hidden="true" />
                {labels.attachment}
                <input type="file" name="file" className="sr-only" />
              </label>
              {state.error === "rate_limited" ? (
                <span className="text-xs text-danger">{labels.rateLimited}</span>
              ) : state.error ? (
                <span className="text-xs text-danger">{labels.error}</span>
              ) : null}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

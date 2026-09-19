import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Ban, Flag } from "lucide-react";
import { requireUser } from "@/auth/session";
import { markRead, threadFor } from "@/domain/messages";
import { PermissionError } from "@/domain/permissions";
import { blockAction } from "@/actions/community";
import { formatMoney } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { Card, CardBody } from "@/ui/card";
import { MessageThread } from "@/ui/message-thread";

export const metadata = { robots: { index: false } };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  let thread;
  try {
    thread = await threadFor(user, id);
  } catch (error) {
    if (error instanceof PermissionError) notFound();
    throw error;
  }
  await markRead(user, id);

  const t = await getTranslations({ locale, namespace: "messages" });
  const tc = await getTranslations({ locale, namespace: "common" });

  return (
    <div className="space-y-4">
      <Link
        href={`/${locale}/nachrichten`}
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("inbox")}
      </Link>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <Card className="flex h-[min(70vh,640px)] flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-fg">{thread.counterpart?.displayName}</p>
              <p className="truncate text-xs text-fg-subtle">{thread.conversation?.subject}</p>
            </div>
            {thread.counterpart?.verifiedAt ? (
              <Badge tone="success">{tc("yes") === "Yes" ? "Verified" : "Verifiziert"}</Badge>
            ) : null}
          </div>

          <MessageThread
            locale={locale}
            conversationId={id}
            currentUserId={user.id}
            blocked={thread.blocked}
            messages={thread.messages.map((message) => ({
              id: message.id,
              body: message.body,
              createdAt: message.createdAt.toISOString(),
              senderId: message.senderId,
              senderName: message.senderName,
              attachments: message.attachments ?? [],
              deleted: !!message.deletedAt,
            }))}
            labels={{
              write: t("write"),
              send: t("send"),
              attachment: t("attachment"),
              blocked: thread.blocked ? t("blocked") : t("blockedByOther"),
              deleted: tc("delete"),
              rateLimited: t("rateLimited"),
              error: tc("error"),
            }}
          />
        </Card>

        <aside className="space-y-3">
          {thread.conversation?.listingSlug ? (
            <Card>
              <CardBody className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-fg-subtle">{t("aboutListing")}</p>
                <Link
                  href={`/${locale}/geraete/${thread.conversation.listingSlug}`}
                  className="block font-medium text-fg hover:underline"
                >
                  {thread.conversation.listingTitle}
                </Link>
                {thread.conversation.listingPrice ? (
                  <p className="tabular font-semibold text-fg">
                    {formatMoney(
                      thread.conversation.listingPrice,
                      thread.conversation.listingCurrency ?? "CHF",
                      locale,
                    )}
                  </p>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          {thread.counterpart ? (
            <Card>
              <CardBody className="space-y-2 text-sm">
                <form action={blockAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="profileId" value={thread.counterpart.id} />
                  <input type="hidden" name="intent" value={thread.blocked ? "unblock" : "block"} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 text-fg-muted hover:text-danger"
                  >
                    <Ban className="size-3.5" aria-hidden="true" />
                    {thread.blocked ? t("unblockUser") : t("blockUser")}
                  </button>
                </form>
                <Link
                  href={`/${locale}/melden?type=user&id=${thread.counterpart.id}`}
                  className="inline-flex items-center gap-1.5 text-fg-muted hover:text-danger"
                >
                  <Flag className="size-3.5" aria-hidden="true" />
                  {t("reportMessage")}
                </Link>
              </CardBody>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

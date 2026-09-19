import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { conversationsFor } from "@/db/queries/account";
import { relativeTime } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { ButtonLink } from "@/ui/button";
import { EmptyState } from "@/ui/empty-state";
import { StorageImage } from "@/ui/storage-image";

export const metadata = { robots: { index: false } };

export default async function InboxPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "messages" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const th = await getTranslations({ locale, namespace: "humour" });

  const conversations = await conversationsFor(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

      {conversations.length === 0 ? (
        <EmptyState
          title={t("noConversations")}
          description={`${th("emptyInbox")} ${t("noConversationsText")}`}
          action={<ButtonLink href={`/${locale}/suche`} size="sm">{tn("discover")}</ButtonLink>}
        />
      ) : (
        <ul className="divide-y divide-border rounded-[var(--radius-lg)] border border-border bg-bg-elevated">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={`/${locale}/nachrichten/${conversation.id}`}
                className="flex items-center gap-3 p-3 transition-colors hover:bg-bg-subtle"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-bg-sunken">
                  <StorageImage path={conversation.listingImage} alt="" sizes="48px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <span className="truncate font-medium text-fg">{conversation.counterpartName}</span>
                    {conversation.unread > 0 ? (
                      <Badge tone="primary">
                        {conversation.unread} {t("unread")}
                      </Badge>
                    ) : null}
                  </p>
                  <p className="truncate text-sm text-fg-muted">{conversation.listingTitle}</p>
                  <p className="truncate text-xs text-fg-subtle">{conversation.preview}</p>
                </div>
                <time className="shrink-0 text-xs text-fg-subtle">
                  {relativeTime(conversation.lastMessageAt, locale)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

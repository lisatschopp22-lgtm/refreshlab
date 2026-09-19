import { getTranslations } from "next-intl/server";
import { currentUser } from "@/auth/session";
import { listComments, type CommentTarget } from "@/domain/comments";
import { reportReasons } from "@/domain/moderation";
import type { Locale } from "@/i18n/routing";
import { CommentThread } from "./comments";

/** Server wrapper: loads the thread and the labels, renders the client tree. */
export async function CommentSection({
  locale,
  targetType,
  targetId,
  sellerId,
  path,
}: {
  locale: Locale;
  targetType: CommentTarget;
  targetId: string;
  sellerId?: string | null;
  path: string;
}) {
  const [user, comments, t, tr] = await Promise.all([
    currentUser(),
    listComments(targetType, targetId, sellerId),
    getTranslations({ locale, namespace: "comments" }),
    getTranslations({ locale, namespace: "report" }),
  ]);
  const tc = await getTranslations({ locale, namespace: "common" });

  const reasonLabel: Record<string, string> = {
    spam: tr("reasonSpam"),
    off_platform: tr("reasonOffPlatform"),
    misleading: tr("reasonMisleading"),
    duplicate: tr("reasonDuplicate"),
    prohibited: tr("reasonProhibited"),
    other: tr("reasonOther"),
  };

  return (
    <CommentThread
      comments={comments}
      locale={locale}
      path={path}
      targetType={targetType}
      targetId={targetId}
      currentUserId={user?.id ?? null}
      isAdmin={user?.role === "admin"}
      signInHref={`/${locale}/anmelden?next=${encodeURIComponent(path)}`}
      labels={{
        title: t("title"),
        placeholder: t("placeholder"),
        post: t("post"),
        reply: t("reply"),
        sendReply: t("sendReply"),
        sellerBadge: t("sellerBadge"),
        expertBadge: t("expertBadge"),
        edited: t("edited"),
        hidden: t("hidden"),
        deleted: t("deleted"),
        emptyTitle: t("empty"),
        emptyHint: t("emptyHint"),
        signIn: t("signInToComment"),
        report: t("report"),
        submitReport: tr("submit"),
        reported: t("reported"),
        replyPlaceholder: t("replyPlaceholder"),
        cancel: tc("cancel"),
        save: tc("save"),
        edit: tc("edit"),
        delete: tc("delete"),
        reportReasons: reportReasons.map((value) => ({ value, label: reasonLabel[value]! })),
      }}
    />
  );
}

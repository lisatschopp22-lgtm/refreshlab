import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/auth/session";
import { adminUser } from "@/db/queries/admin";
import { commentAdminAction, listingAdminAction, userAction } from "@/actions/admin";
import { formatDate, formatMoney } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { Card, CardBody, CardHeader } from "@/ui/card";

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const me = await requireAdmin(locale);

  const data = await adminUser(id);
  if (!data) notFound();

  const t = await getTranslations({ locale, namespace: "admin" });
  const ts = await getTranslations({ locale, namespace: "status" });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{data.profile.displayName}</h1>
          <p className="tabular text-sm text-fg-subtle">{data.profile.email}</p>
          <p className="mt-1.5 flex flex-wrap gap-1.5">
            {data.profile.role === "admin" ? <Badge tone="primary">admin</Badge> : null}
            {data.profile.verifiedAt ? <Badge tone="success">{t("verify")}</Badge> : null}
            {data.profile.suspendedAt ? (
              <Badge tone="danger">
                {t("suspend")} · {formatDate(data.profile.suspendedAt, locale)}
              </Badge>
            ) : null}
            {data.memberships.map((membership) => (
              <Badge key={membership.slug} tone="outline">
                {membership.name} ({membership.role})
              </Badge>
            ))}
          </p>
          {data.profile.suspendedReason ? (
            <p className="mt-1 text-sm text-danger">{data.profile.suspendedReason}</p>
          ) : null}
        </div>

        {id !== me.id ? (
          <form action={userAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="profileId" value={id} />
            <label>
              <span className="mb-1 block text-xs text-fg-subtle">{t("resolutionNote")}</span>
              <input
                name="reason"
                className="h-9 w-56 rounded-[var(--radius-md)] border border-border-strong bg-bg-elevated px-3 text-sm"
              />
            </label>
            <button
              name="intent"
              value={data.profile.suspendedAt ? "unsuspend" : "suspend"}
              className="h-9 rounded-[var(--radius-md)] border border-border px-3 text-sm text-fg-muted hover:bg-bg-subtle"
            >
              {data.profile.suspendedAt ? t("unsuspend") : t("suspend")}
            </button>
          </form>
        ) : null}
      </div>

      <Card>
        <CardHeader title={t("listings")} description={`${data.listings.length}`} />
        <CardBody className="space-y-2">
          {data.listings.map((listing) => (
            <div key={listing.id} className="flex flex-wrap items-center gap-3 border-b border-border py-2 last:border-b-0">
              <Link href={`/${locale}/geraete/${listing.slug}`} className="min-w-0 flex-1 truncate text-fg hover:underline">
                {listing.title}
              </Link>
              <Badge tone={listing.deletedAt ? "danger" : "neutral"}>
                {listing.deletedAt ? t("hide") : ts(listing.status)}
              </Badge>
              <span className="tabular text-sm">{formatMoney(listing.priceCents, listing.currency, locale)}</span>
              <form action={listingAdminAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="listingId" value={listing.id} />
                <input type="hidden" name="intent" value={listing.deletedAt ? "restore" : "hide"} />
                <button className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs text-fg-muted hover:bg-bg-subtle">
                  {listing.deletedAt ? t("restore") : t("hide")}
                </button>
              </form>
            </div>
          ))}
          {data.listings.length === 0 ? <p className="text-sm text-fg-subtle">—</p> : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("comments")} description={`${data.comments.length}`} />
        <CardBody className="space-y-2">
          {data.comments.map((comment) => (
            <div key={comment.id} className="flex flex-wrap items-center gap-3 border-b border-border py-2 last:border-b-0">
              <p className="min-w-0 flex-1 truncate text-sm text-fg-muted">{comment.body}</p>
              <Badge tone={comment.status === "hidden" ? "warning" : "neutral"}>{comment.status}</Badge>
              <form action={commentAdminAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="commentId" value={comment.id} />
                <input type="hidden" name="intent" value={comment.status === "hidden" ? "show" : "hide"} />
                <button className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs text-fg-muted hover:bg-bg-subtle">
                  {comment.status === "hidden" ? t("restore") : t("hide")}
                </button>
              </form>
            </div>
          ))}
          {data.comments.length === 0 ? <p className="text-sm text-fg-subtle">—</p> : null}
        </CardBody>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/auth/session";
import { adminUsers } from "@/db/queries/admin";
import { userAction } from "@/actions/admin";
import { formatDate } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { Table, Td, Th } from "@/ui/table";

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const me = await requireAdmin(locale);
  const { q } = await searchParams;

  const t = await getTranslations({ locale, namespace: "admin" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const users = await adminUsers(q);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">{t("users")}</h1>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder={tc("search")}
            className="h-9 w-56 rounded-[var(--radius-md)] border border-border-strong bg-bg-elevated px-3 text-sm"
          />
          <button className="h-9 rounded-[var(--radius-md)] border border-border px-3 text-sm">
            {tc("search")}
          </button>
        </form>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>{t("users")}</Th>
            <Th>{t("organisations")}</Th>
            <Th>{t("listings")}</Th>
            <Th>{t("when")}</Th>
            <Th>{t("action")}</Th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <Td>
                <Link
                  href={`/${locale}/admin/nutzende/${user.id}`}
                  className="font-medium text-fg hover:underline"
                >
                  {user.displayName}
                </Link>
                <p className="tabular text-xs text-fg-subtle">{user.email}</p>
                <p className="mt-1 flex flex-wrap gap-1">
                  {user.role === "admin" ? <Badge tone="primary">admin</Badge> : null}
                  {user.verifiedAt ? <Badge tone="success">✓</Badge> : null}
                  {user.suspendedAt ? <Badge tone="danger">{t("suspend")}</Badge> : null}
                </p>
              </Td>
              <Td className="text-fg-muted">{user.organisationNames ?? "—"}</Td>
              <Td className="tabular">
                {user.listingCount} · {user.commentCount} · {user.orderCount}
              </Td>
              <Td className="tabular whitespace-nowrap text-xs text-fg-subtle">
                {formatDate(user.createdAt, locale)}
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1.5">
                  <form action={userAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="profileId" value={user.id} />
                    <input type="hidden" name="intent" value={user.verifiedAt ? "unverify" : "verify"} />
                    <button className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs text-fg-muted hover:bg-bg-subtle">
                      {user.verifiedAt ? t("unverify") : t("verify")}
                    </button>
                  </form>
                  {user.id !== me.id ? (
                    <>
                      <form action={userAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="profileId" value={user.id} />
                        <input type="hidden" name="intent" value={user.suspendedAt ? "unsuspend" : "suspend"} />
                        <button className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs text-fg-muted hover:bg-bg-subtle">
                          {user.suspendedAt ? t("unsuspend") : t("suspend")}
                        </button>
                      </form>
                      <form action={userAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="profileId" value={user.id} />
                        <input type="hidden" name="intent" value={user.role === "admin" ? "remove_admin" : "make_admin"} />
                        <button className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs text-fg-muted hover:bg-bg-subtle">
                          {user.role === "admin" ? t("removeAdmin") : t("makeAdmin")}
                        </button>
                      </form>
                    </>
                  ) : null}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/auth/session";
import { openReportCount } from "@/domain/moderation";
import type { Locale } from "@/i18n/routing";
import { Logo } from "@/ui/site/logo";

export const metadata = { robots: { index: false } };

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const user = await requireAdmin(locale);
  const t = await getTranslations({ locale, namespace: "admin" });
  const openReports = await openReportCount();

  const items = [
    { href: `/${locale}/admin`, label: t("overview") },
    { href: `/${locale}/admin/meldungen`, label: t("reports"), badge: openReports },
    { href: `/${locale}/admin/nutzende`, label: t("users") },
    { href: `/${locale}/admin/organisationen`, label: t("organisations") },
    { href: `/${locale}/admin/inserate`, label: t("listings") },
    { href: `/${locale}/admin/geraetedaten`, label: t("models") },
    { href: `/${locale}/admin/kommentare`, label: t("comments") },
    { href: `/${locale}/admin/transaktionen`, label: t("orders") },
    { href: `/${locale}/admin/inhalte`, label: t("pages") },
    { href: `/${locale}/admin/einstellungen`, label: t("settings") },
    { href: `/${locale}/admin/audit`, label: t("audit") },
  ];

  return (
    // The ops console defaults to the graphite palette in dark (mockup S19),
    // but the palette switcher still overrides it.
    <div data-palette="graphite" data-theme="dark" className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border bg-bg-subtle">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href={`/${locale}/admin`} className="flex items-center gap-2">
            <Logo />
            <span className="text-xs uppercase tracking-[0.18em] text-fg-subtle">/ ops</span>
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1 text-sm">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[var(--radius-md)] px-2.5 py-1.5 text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg"
              >
                {item.label}
                {item.badge ? (
                  <span className="tabular ml-1.5 rounded-[var(--radius-full)] bg-danger px-1.5 text-xs text-primary-fg">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-fg-subtle">{user.displayName}</span>
            <Link
              href={`/${locale}`}
              className="inline-flex items-center gap-1 text-fg-muted hover:text-fg"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              refreshLab
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-4 py-6">{children}</main>
    </div>
  );
}

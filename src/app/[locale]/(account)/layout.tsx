import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Building2, Heart, LayoutDashboard, LogOut, MessageSquare, Package,
  Settings, ShieldCheck, Star, Tag,
} from "lucide-react";
import { requireUser } from "@/auth/session";
import { signOutAction } from "@/actions/auth";
import type { Locale } from "@/i18n/routing";
import { SiteFooter } from "@/ui/site/footer";
import { SiteHeader } from "@/ui/site/header";

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "nav" });

  const items = [
    { href: `/${locale}/konto`, label: t("dashboard"), icon: LayoutDashboard },
    { href: `/${locale}/konto/inserate`, label: t("myListings"), icon: Tag },
    { href: `/${locale}/nachrichten`, label: t("messages"), icon: MessageSquare },
    { href: `/${locale}/konto/angebote`, label: t("offers"), icon: Package },
    { href: `/${locale}/konto/transaktionen`, label: t("orders"), icon: Package },
    { href: `/${locale}/konto/bewertungen`, label: t("ratings"), icon: Star },
    { href: `/${locale}/konto/merkliste`, label: t("watchlist"), icon: Heart },
    { href: `/${locale}/konto/organisation`, label: "Organisation", icon: Building2 },
    { href: `/${locale}/konto/einstellungen`, label: t("settings"), icon: Settings },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} />
      <div className="mx-auto w-full max-w-[1200px] flex-1 gap-8 px-4 py-6 lg:grid lg:grid-cols-[210px_1fr]">
        <aside className="mb-6 lg:mb-0">
          <nav className="flex gap-1 overflow-x-auto lg:flex-col">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
            {user.role === "admin" ? (
              <Link
                href={`/${locale}/admin`}
                className="flex items-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary-subtle"
              >
                <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
                {t("admin")}
              </Link>
            ) : null}
            <form action={signOutAction}>
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="flex w-full items-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
              >
                <LogOut className="size-4 shrink-0" aria-hidden="true" />
                {t("signOut")}
              </button>
            </form>
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
      <SiteFooter locale={locale} />
    </div>
  );
}

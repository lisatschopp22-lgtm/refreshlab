import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { currentUser } from "@/auth/session";
import { Menu, Search, User } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { ButtonLink } from "../button";
import { SwitchableLogo } from "./logo-switchable";
import { readDesignPrefs } from "@/ui/design-prefs.server";
import { LocaleSwitch } from "./locale-switch";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const user = await currentUser();
  const prefs = await readDesignPrefs();

  const links = [
    { href: `/${locale}/suche`, label: t("discover") },
    { href: `/${locale}/katalog`, label: t("catalogue") },
    { href: `/${locale}/p/gebrauchte-zentrifuge-kaufen`, label: t("guides") },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4">
        <Link href={`/${locale}`} className="shrink-0">
          <SwitchableLogo initial={prefs.logo} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <form action={`/${locale}/suche`} className="ml-auto hidden max-w-xs flex-1 lg:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <input
              type="search"
              name="q"
              aria-label={tc("search")}
              placeholder={tc("searchPlaceholder")}
              className="h-9 w-full rounded-[var(--radius-full)] border border-border bg-bg-subtle pl-9 pr-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-2 focus:outline-[var(--ring)]"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <LocaleSwitch locale={locale} />
          {user ? (
            <Link
              href={`/${locale}/konto`}
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] px-2 text-sm text-fg-muted hover:bg-bg-subtle hover:text-fg"
            >
              <User className="size-4" />
              <span className="hidden max-w-28 truncate sm:inline">{user.displayName}</span>
            </Link>
          ) : (
            <Link
              href={`/${locale}/anmelden`}
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] px-2 text-sm text-fg-muted hover:bg-bg-subtle hover:text-fg"
              aria-label={t("signIn")}
            >
              <User className="size-4" />
              <span className="hidden sm:inline">{t("signIn")}</span>
            </Link>
          )}
          <ButtonLink href={`/${locale}/verkaufen`} size="sm">
            {t("sell")}
          </ButtonLink>
          <Link
            href={`/${locale}/suche`}
            className="inline-flex size-9 items-center justify-center rounded-[var(--radius-md)] text-fg-muted hover:bg-bg-subtle md:hidden"
            aria-label={tc("search")}
          >
            <Menu className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

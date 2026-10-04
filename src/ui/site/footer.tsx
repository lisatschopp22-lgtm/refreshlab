import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { contentPages } from "@/db/schema/operations";
import { and, eq } from "drizzle-orm";
import { listCategories } from "@/db/queries/catalogue";
import { pick } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { SwitchableLogo } from "./logo-switchable";
import { readDesignPrefs } from "@/ui/design-prefs.server";

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "footer" });
  const tn = await getTranslations({ locale, namespace: "nav" });

  const prefs = await readDesignPrefs();
  const [pages, categories] = await Promise.all([
    db
      .select({ slug: contentPages.slug, title: contentPages.title })
      .from(contentPages)
      .where(and(eq(contentPages.published, true), eq(contentPages.showInFooter, true))),
    listCategories(),
  ]);

  const column = "space-y-2 text-sm";
  const link = "block text-fg-muted transition-colors hover:text-fg";

  return (
    <footer className="mt-20 border-t border-border bg-bg-subtle">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <SwitchableLogo initial={prefs.logo} />
          <p className="max-w-xs text-sm text-fg-muted">{t("tagline")}</p>
        </div>

        <div className={column}>
          <p className="font-semibold text-fg">{t("marketplace")}</p>
          <Link href={`/${locale}/suche`} className={link}>{tn("discover")}</Link>
          <Link href={`/${locale}/qualifizierte-geraete`} className={link}>{tn("qualified")}</Link>
          <Link href={`/${locale}/ersatzteillager`} className={link}>{tn("parts")}</Link>
          <Link href={`/${locale}/verbrauchsmaterialien`} className={link}>{tn("consumables")}</Link>
          <Link href={`/${locale}/katalog`} className={link}>{tn("catalogue")}</Link>
          <Link href={`/${locale}/verkaufen`} className={link}>{tn("sell")}</Link>
          <Link href={`/${locale}/hersteller`} className={link}>{t("manufacturers")}</Link>
        </div>

        <div className={column}>
          <p className="font-semibold text-fg">{t("categories")}</p>
          {categories.slice(0, 6).map((category) => (
            <Link key={category.slug} href={`/${locale}/kategorie/${category.slug}`} className={link}>
              {pick(category.name, locale)}
            </Link>
          ))}
        </div>

        <div className={column}>
          <p className="font-semibold text-fg">{t("legal")}</p>
          {pages.map((page) => (
            <Link key={page.slug} href={`/${locale}/p/${page.slug}`} className={link}>
              {pick(page.title, locale)}
            </Link>
          ))}
        </div>
      </div>

      <div className="border-t border-border">
        <p className="mx-auto max-w-[1200px] px-4 py-4 text-xs text-fg-subtle">{t("prototype")}</p>
      </div>
    </footer>
  );
}

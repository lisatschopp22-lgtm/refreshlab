import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { IBM_Plex_Mono, IBM_Plex_Sans, Inter } from "next/font/google";
import { isLocale, locales, type Locale } from "@/i18n/routing";
import { readDesignPrefs } from "@/ui/design-prefs.server";
import { DesignSwitcher } from "@/ui/design-switcher";
import { ToastProvider } from "@/ui/toast";
import { flagsFromEnv } from "@/domain/flags";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    metadataBase: new URL(base),
    title: { default: t("defaultTitle"), template: `%s · ${t("siteName")}` },
    description: t("defaultDescription"),
    applicationName: t("siteName"),
    openGraph: {
      type: "website",
      siteName: t("siteName"),
      locale: locale === "de" ? "de_CH" : "en_GB",
      title: t("defaultTitle"),
      description: t("defaultDescription"),
    },
    alternates: {
      canonical: `${base}/${locale}`,
      languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}`])),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale as Locale);

  const prefs = await readDesignPrefs();
  const flags = flagsFromEnv();
  const t = await getTranslations({ locale, namespace: "design" });

  return (
    <html
      lang={locale}
      data-palette={prefs.palette}
      data-font={prefs.font}
      data-density={prefs.density}
      {...(prefs.theme === "system" ? {} : { "data-theme": prefs.theme })}
      className={`${inter.variable} ${plex.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-bg text-fg antialiased">
        <NextIntlClientProvider>
          <ToastProvider>
            {children}
            {flags.showDesignSwitcher ? (
              <DesignSwitcher
                initial={prefs}
                labels={{
                  title: t("title"),
                  palette: t("palette"),
                  theme: t("theme"),
                  font: t("font"),
                  density: t("density"),
                  hint: t("switcherHint"),
                  close: "×",
                  system: t("system"),
                  light: t("light"),
                  dark: t("dark"),
                  comfortable: t("comfortable"),
                  compact: t("compact"),
                }}
              />
            ) : null}
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

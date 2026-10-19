import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { IBM_Plex_Mono, IBM_Plex_Sans, Inter, Source_Serif_4, Space_Grotesk } from "next/font/google";
import { isLocale, locales, type Locale } from "@/i18n/routing";
import { prefsToDataset } from "@/ui/design-prefs";
import { readDesignPrefs } from "@/ui/design-prefs.server";
import { DesignSwitcher } from "@/ui/design-switcher";
import { ToastProvider } from "@/ui/toast";
import { flags as readFlags } from "@/domain/settings";
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
// Display faces. Only the selected one is ever rendered, so the others are
// never fetched by the browser.
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});
const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

/** Every dimension and every option the switcher can show. */
function optionLabels(t: (key: string) => string) {
  const keys = [
    "title", "palette", "theme", "font", "density", "radius", "depth", "contrast", "logo",
    "shuffle", "reset", "copyLink", "close",
    "system", "light", "cream", "vanilla", "linen", "sand", "greige", "latte", "dark",
    "inter", "plex", "grotesk", "serif",
    "compact", "comfortable", "roomy",
    "sharp", "soft", "round",
    "flat", "raised", "lifted",
    "normal", "high",
    "botanical", "moss", "clinical", "ocean", "aqua", "ember",
    "copper", "crimson", "plum", "graphite", "slate", "ink",
  ];
  const labels = Object.fromEntries(keys.map((key) => [key, t(key)]));
  labels.hint = t("switcherHint");
  return labels;
}

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
  const flags = await readFlags();
  const t = await getTranslations({ locale, namespace: "design" });

  return (
    <html
      lang={locale}
      {...prefsToDataset(prefs)}
      className={`${inter.variable} ${plex.variable} ${plexMono.variable} ${grotesk.variable} ${serif.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-bg text-fg antialiased">
        <NextIntlClientProvider>
          <ToastProvider>
            {children}
            {flags.showDesignSwitcher ? (
              <DesignSwitcher
                initial={prefs}
                labels={optionLabels(t)}
              />
            ) : null}
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

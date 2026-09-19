import { setRequestLocale } from "next-intl/server";
import { SiteFooter } from "@/ui/site/footer";
import { SiteHeader } from "@/ui/site/header";
import type { Locale } from "@/i18n/routing";

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale as Locale} />
      <div className="flex-1">{children}</div>
      <SiteFooter locale={locale as Locale} />
    </div>
  );
}

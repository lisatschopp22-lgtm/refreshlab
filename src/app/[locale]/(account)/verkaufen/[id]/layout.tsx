import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { getEditableListing } from "@/domain/listings";
import { PermissionError } from "@/domain/permissions";
import type { Locale } from "@/i18n/routing";

export const metadata = { robots: { index: false } };

export default async function SellWizardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  try {
    await getEditableListing(user, id);
  } catch (error) {
    if (error instanceof PermissionError) notFound();
    throw error;
  }

  return <div className="mx-auto max-w-2xl">{children}</div>;
}

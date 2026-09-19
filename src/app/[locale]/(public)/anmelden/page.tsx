import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { currentUser } from "@/auth/session";
import type { Locale } from "@/i18n/routing";
import { Card, CardBody } from "@/ui/card";
import { SignInForm } from "@/ui/auth-forms";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("signIn"), robots: { index: false } };
}

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const { next } = await searchParams;

  if (await currentUser()) redirect(next ?? `/${locale}/konto`);
  const t = await getTranslations({ locale, namespace: "auth" });

  const labels = Object.fromEntries(
    [
      "signIn", "signUp", "email", "password", "displayName", "forgotPassword", "magicLink",
      "magicLinkSent", "resetSent", "noAccount", "hasAccount", "invalidCredentials",
      "passwordTooShort", "emailInvalid", "suspended", "checkMailpit",
    ].map((key) => [key, t(key)]),
  );

  return (
    <main className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">{t("signInTitle")}</h1>
      <p className="mt-1 text-sm text-fg-muted">{t("signInSubtitle")}</p>
      <Card className="mt-6">
        <CardBody>
          <SignInForm locale={locale} next={next} labels={labels} />
        </CardBody>
      </Card>
    </main>
  );
}

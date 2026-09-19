import { getTranslations, setRequestLocale } from "next-intl/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles } from "@/db/schema/identity";
import { requireUser } from "@/auth/session";
import type { Locale } from "@/i18n/routing";
import { Card, CardBody, CardHeader } from "@/ui/card";
import { ProfileForm } from "@/ui/profile-forms";
import { StorageImage } from "@/ui/storage-image";

export const metadata = { robots: { index: false } };

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);

  const t = await getTranslations({ locale, namespace: "account" });
  const tc = await getTranslations({ locale, namespace: "common" });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("profile")}</h1>
      <Card>
        <CardHeader title={t("profile")} description={user.email} />
        <CardBody className="space-y-5">
          {profile?.avatarPath ? (
            <div className="relative size-20 overflow-hidden rounded-full border border-border bg-bg-sunken">
              <StorageImage path={profile.avatarPath} alt="" sizes="80px" />
            </div>
          ) : null}
          <ProfileForm
            locale={locale}
            defaults={{
              displayName: profile?.displayName ?? "",
              bio: profile?.bio ?? "",
              city: profile?.city ?? "",
              country: profile?.country ?? "",
              uiLocale: profile?.locale ?? "de",
            }}
            labels={{
              displayName: t("displayName"),
              bio: t("bio"),
              city: t("city"),
              country: t("country"),
              avatar: t("avatar"),
              language: tc("language"),
              save: tc("save"),
              saved: t("saved"),
              error: tc("error"),
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}

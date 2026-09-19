import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/auth/session";
import { adminPage } from "@/db/queries/admin";
import type { Locale } from "@/i18n/routing";
import { Card, CardBody, CardHeader } from "@/ui/card";
import { PageEditor } from "@/ui/admin-forms";

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireAdmin(locale);

  const t = await getTranslations({ locale, namespace: "admin" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const isNew = slug === "neu";
  const page = isNew ? null : await adminPage(slug);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight">{isNew ? t("newPage") : t("editPage")}</h1>
      <Card>
        <CardHeader title={page ? `/${page.slug}` : t("newPage")} />
        <CardBody>
          <PageEditor
            locale={locale}
            defaults={{
              slug: page?.slug ?? "",
              titleDe: page?.title.de ?? "",
              titleEn: page?.title.en ?? "",
              bodyDe: page?.body.de ?? "",
              bodyEn: page?.body.en ?? "",
              published: page?.published ?? true,
              showInFooter: page?.showInFooter ?? true,
            }}
            labels={{
              slug: "Slug",
              title: locale === "de" ? "Titel" : "Title",
              body: locale === "de" ? "Inhalt" : "Content",
              published: t("published"),
              footer: "Footer",
              save: tc("save"),
              error: tc("error"),
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}

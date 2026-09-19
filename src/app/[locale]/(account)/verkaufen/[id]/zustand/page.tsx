import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { getEditableListing } from "@/domain/listings";
import { listingAttachmentsFor, listingImagesFor } from "@/actions/listings";
import { conditions } from "@/domain/conditions";
import type { Locale } from "@/i18n/routing";
import { Card, CardBody, CardHeader } from "@/ui/card";
import { AttachmentUploader, ConditionForm, ImageUploader } from "@/ui/sell-forms";
import { WizardSteps } from "@/ui/wizard-steps";

export default async function ConditionStep({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  const listing = await getEditableListing(user, id);
  const [images, attachments] = await Promise.all([listingImagesFor(id), listingAttachmentsFor(id)]);

  const t = await getTranslations({ locale, namespace: "sell" });
  const tc = await getTranslations({ locale, namespace: "conditions" });
  const tl = await getTranslations({ locale, namespace: "listing" });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <WizardSteps steps={[t("step1"), t("step2"), t("step3"), t("step4")]} current={2} />
      </div>

      <Card>
        <CardHeader title={t("step2")} description={t("conditionNotesHint")} />
        <CardBody>
          <ConditionForm
            locale={locale}
            listingId={id}
            defaults={{
              title: listing.title,
              condition: listing.condition,
              conditionNotes: listing.conditionNotes ?? "",
              scopeOfDelivery: listing.scopeOfDelivery ?? "",
              description: listing.description ?? "",
              year: listing.year,
              operatingHours: listing.operatingHours,
            }}
            conditions={conditions.map((value) => ({ value, label: tc(value) }))}
            labels={{
              titleField: t("titleField"),
              conditionTitle: t("conditionTitle"),
              conditionNotes: t("conditionNotes"),
              conditionNotesHint: t("conditionNotesHint"),
              scopeOfDelivery: t("scopeOfDelivery"),
              scopeHint: t("scopeHint"),
              description: t("description"),
              year: t("year"),
              operatingHours: t("operatingHours"),
              continueToPrice: t("continueToPrice"),
              saveDraft: t("saveDraft"),
              draftSaved: t("draftSaved"),
              tooShort: locale === "de" ? "Bitte etwas ausführlicher." : "Please add more detail.",
            }}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("images")} description={t("imagesHint")} />
        <CardBody>
          <ImageUploader
            locale={locale}
            listingId={id}
            images={images}
            labels={{
              addImage: t("addImage"),
              imagesHint: t("imagesHint"),
              remove: locale === "de" ? "Entfernen" : "Remove",
              uploadFailed: locale === "de" ? "Upload fehlgeschlagen." : "Upload failed.",
            }}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("attachments")} description={t("attachmentsHint")} />
        <CardBody className="space-y-3">
          {attachments.length ? (
            <ul className="space-y-1.5 text-sm">
              {attachments.map((attachment) => (
                <li key={attachment.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-fg">{attachment.filename}</span>
                  <span className="text-xs text-fg-subtle">{attachment.kind}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <AttachmentUploader
            locale={locale}
            listingId={id}
            kinds={[
              { value: "service_report", label: locale === "de" ? "Servicebericht" : "Service report" },
              { value: "certificate", label: locale === "de" ? "Zertifikat" : "Certificate" },
              { value: "decontamination", label: locale === "de" ? "Dekontamination" : "Decontamination" },
              { value: "manual", label: locale === "de" ? "Handbuch" : "Manual" },
              { value: "other", label: locale === "de" ? "Anderes" : "Other" },
            ]}
            labels={{
              attachments: tl("documents"),
              upload: locale === "de" ? "Hochladen" : "Upload",
              saved: locale === "de" ? "Gespeichert" : "Saved",
              uploadFailed: locale === "de" ? "Fehlgeschlagen" : "Failed",
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}

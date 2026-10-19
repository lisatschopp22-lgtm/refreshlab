import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { getModelStatus } from "@/db/queries/catalogue";
import { getEditableListing, hasSerialPhoto, readyToPublish } from "@/domain/listings";
import { listingImagesFor } from "@/actions/listings";
import { calculateFee } from "@/domain/fees";
import { sellerNetCents } from "@/domain/fees";
import { formatMoney } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { Card, CardBody, CardHeader } from "@/ui/card";
import { StorageImage } from "@/ui/storage-image";
import { PublishForm } from "@/ui/sell-forms";
import { WizardSteps } from "@/ui/wizard-steps";

export default async function ReviewStep({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  const listing = await getEditableListing(user, id);
  const images = await listingImagesFor(id);

  const t = await getTranslations({ locale, namespace: "sell" });
  const tc = await getTranslations({ locale, namespace: "conditions" });
  const to = await getTranslations({ locale, namespace: "orders" });

  const [serialPhoto, modelStatus] = await Promise.all([hasSerialPhoto(id), getModelStatus(listing.modelId)]);
  const problems = readyToPublish(listing, images.length, serialPhoto);
  const newDevice = modelStatus === "pending";
  const fee = calculateFee(listing.priceCents, listing.currency);
  const net = sellerNetCents(listing.priceCents, fee.cents);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <WizardSteps steps={[t("step1"), t("step2"), t("step3"), t("step4")]} current={4} />
      </div>

      <Card>
        <CardHeader
          title={t("reviewTitle")}
          action={
            <Link href={`/${locale}/verkaufen/${id}/zustand`} className="text-sm text-primary hover:underline">
              {locale === "de" ? "Bearbeiten" : "Edit"}
            </Link>
          }
        />
        <CardBody className="space-y-4">
          <div className="flex gap-4">
            {images[0] ? (
              <div className="relative size-28 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-bg-sunken">
                <StorageImage path={images[0].storagePath} alt="" sizes="112px" />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-fg">{listing.title}</h2>
              <p className="mt-1 flex flex-wrap gap-1.5">
                <Badge tone="primary">{tc(listing.condition)}</Badge>
                {listing.year ? <Badge tone="neutral">{listing.year}</Badge> : null}
                {listing.locationCity ? <Badge tone="outline">{listing.locationCity}</Badge> : null}
              </p>
              <p className="tabular mt-2 text-xl font-bold text-fg">
                {formatMoney(listing.priceCents, listing.currency, locale)}
              </p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-fg-muted">{listing.conditionNotes}</p>

          <dl className="space-y-1.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">{to("itemPrice")}</dt>
              <dd className="tabular">{formatMoney(listing.priceCents, listing.currency, locale)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">{to("platformFee")}</dt>
              <dd className="tabular text-fg-muted">
                − {formatMoney(fee.cents, listing.currency, locale)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-border pt-1.5 font-medium">
              <dt>{to("sellerReceives")}</dt>
              <dd className="tabular">{formatMoney(net, listing.currency, locale)}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      {newDevice ? (
        <p className="rounded-[var(--radius-md)] bg-info-subtle px-3 py-2 text-sm text-info">{t("reviewNewDevice")}</p>
      ) : null}

      <PublishForm
        locale={locale}
        listingId={id}
        labels={{
          publish: newDevice ? t("submitForReview") : t("publish"),
          serialPhoto: t("serialPhotoTitle"),
          incomplete: locale === "de" ? "Es fehlt noch etwas:" : "Something is still missing:",
          title: t("titleField"),
          price: t("price"),
          location: t("locationCity"),
          conditionNotes: t("conditionNotes"),
          images: t("images"),
        }}
      />

      {problems.length ? (
        <p className="text-sm text-fg-subtle">
          {problems.length} {locale === "de" ? "Punkt(e) offen" : "item(s) outstanding"}
        </p>
      ) : null}
    </div>
  );
}

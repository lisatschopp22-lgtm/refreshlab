import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { offersForUser } from "@/domain/offers";
import { checkoutFromOfferAction } from "@/actions/transactions";
import { formatMoney, relativeTime } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { buttonClass } from "@/ui/button";
import { Card, CardBody, CardHeader } from "@/ui/card";
import { EmptyState } from "@/ui/empty-state";
import { OfferActions } from "@/ui/transaction-forms";

export const metadata = { robots: { index: false } };

const tone = {
  open: "primary",
  countered: "warning",
  accepted: "success",
  rejected: "neutral",
  expired: "neutral",
  withdrawn: "neutral",
} as const;

export default async function OffersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "offers" });
  const ts = await getTranslations({ locale, namespace: "offerStatus" });
  const tc = await getTranslations({ locale, namespace: "common" });

  const { incoming, outgoing } = await offersForUser(user.id);

  const labels = {
    accept: t("accept"),
    reject: t("reject"),
    counter: t("counter"),
    sendCounter: t("sendCounter"),
    withdraw: t("withdraw"),
    counterAmount: t("counterAmount"),
    invalid_transition: tc("error"),
    invalid_amount: t("amount"),
    generic: tc("error"),
    cancel: tc("cancel"),
  };

  const renderRow = (
    row: (typeof incoming)[number],
    role: "buyer" | "seller",
  ) => (
    <li key={row.offer.id} className="space-y-2 border-b border-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/${locale}/geraete/${row.listingSlug}`}
            className="truncate font-medium text-fg hover:underline"
          >
            {row.listingTitle}
          </Link>
          <p className="tabular text-xs text-fg-subtle">
            {t("listPrice")} {formatMoney(row.listingPriceCents, row.offer.currency, locale)} ·{" "}
            {relativeTime(row.offer.createdAt, locale)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={tone[row.offer.status]}>{ts(row.offer.status)}</Badge>
          <span className="tabular font-semibold text-fg">
            {formatMoney(row.offer.amountCents, row.offer.currency, locale)}
          </span>
        </div>
      </div>

      {row.offer.message ? (
        <p className="text-sm text-fg-muted">{row.offer.message}</p>
      ) : null}

      <OfferActions
        locale={locale}
        offerId={row.offer.id}
        role={role}
        status={row.offer.status}
        currency={row.offer.currency}
        labels={labels}
      />

      {role === "buyer" && row.offer.status === "accepted" && row.listingStatus !== "sold" ? (
        <form action={checkoutFromOfferAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="offerId" value={row.offer.id} />
          <input type="hidden" name="listingId" value={row.offer.listingId} />
          <button type="submit" className={buttonClass("primary", "sm")}>
            {t("accepted")}
          </button>
        </form>
      ) : null}
    </li>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

      <Card>
        <CardHeader title={t("received")} />
        <CardBody>
          {incoming.length ? (
            <ul>{incoming.map((row) => renderRow(row, "seller"))}</ul>
          ) : (
            <EmptyState title={t("noOffers")} />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("sent")} />
        <CardBody>
          {outgoing.length ? (
            <ul>{outgoing.map((row) => renderRow(row, "buyer"))}</ul>
          ) : (
            <EmptyState title={t("noOffers")} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

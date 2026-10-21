import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { pendingRatings, ratingList, ratingsGivenBy } from "@/db/queries/ratings";
import { formatDate } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { ButtonLink } from "@/ui/button";
import { Card, CardBody, CardHeader } from "@/ui/card";
import { EmptyState } from "@/ui/empty-state";
import { RatingList, Stars } from "@/ui/ratings";

export const metadata = { robots: { index: false } };

export default async function RatingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "ratings" });

  const [pending, received, given] = await Promise.all([
    pendingRatings(user),
    ratingList({ profileId: user.id }, 50),
    ratingsGivenBy(user.id),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

      <Card>
        <CardHeader title={t("pendingTitle")} description={t("pendingHint")} />
        <CardBody>
          {pending.length ? (
            <ul className="divide-y divide-border">
              {pending.map((item) => (
                <li key={item.orderId} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-fg">{item.listingTitle}</p>
                    <p className="tabular text-xs text-fg-subtle">
                      {item.reference} ·{" "}
                      {item.side === "buyer"
                        ? t("rateSeller", { name: item.counterpartName })
                        : t("rateBuyer", { name: item.counterpartName })}{" "}
                      · {t("due", { date: formatDate(item.periodEnds, locale) })}
                    </p>
                  </div>
                  <ButtonLink href={`/${locale}/bestellung/${item.orderId}`} size="sm">
                    {t("rateNow")}
                  </ButtonLink>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={t("pendingEmpty")} />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("receivedTitle")} />
        <CardBody>
          {received.length ? (
            <RatingList
              locale={locale}
              items={received.map((item) => ({
                ...item,
                context: item.side === "buyer" ? t("raterBuyer") : t("raterSeller"),
                starsLabel: t("starsLabel", { score: item.score }),
              }))}
            />
          ) : (
            <EmptyState title={t("receivedEmpty")} />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("givenTitle")} />
        <CardBody>
          {given.length ? (
            <ul className="divide-y divide-border">
              {given.map((item) => (
                <li key={item.id} className="space-y-1.5 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars score={item.score} label={t("starsLabel", { score: item.score })} className="text-sm" />
                    <Link
                      href={`/${locale}/bestellung/${item.orderId}`}
                      className="text-sm font-medium text-fg hover:underline"
                    >
                      {t("forName", { name: item.rateeName })}
                    </Link>
                    <time className="tabular ml-auto text-xs text-fg-subtle">{formatDate(item.createdAt, locale)}</time>
                  </div>
                  {item.comment ? <p className="text-sm leading-relaxed text-fg-muted">{item.comment}</p> : null}
                  <p className="text-xs text-fg-subtle">
                    {item.listingTitle}
                    {item.hidden ? ` · ${t("hidden")}` : item.revealed ? "" : ` · ${t("notYetVisible")}`}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={t("givenEmpty")} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

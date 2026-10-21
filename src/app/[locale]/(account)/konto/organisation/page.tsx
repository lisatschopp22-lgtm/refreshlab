import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { organisationMembers, organisations, profiles } from "@/db/schema/identity";
import { requireUser } from "@/auth/session";
import { specialRatesOf } from "@/db/queries/special-rates";
import { completedSales } from "@/domain/fee-standing";
import { nextTier, tierRate } from "@/domain/fees";
import { feeRule } from "@/domain/settings";
import { formatDate, formatPercent } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { Card, CardBody, CardHeader } from "@/ui/card";
import { AddMemberForm, CreateOrganisationForm } from "@/ui/profile-forms";
import { SpecialRateRequestForm } from "@/ui/special-rate-form";

export const metadata = { robots: { index: false } };

export default async function OrganisationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "account" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const tf = await getTranslations({ locale, namespace: "fees" });

  const ids = user.organisations.map((o) => o.id);
  const rows = ids.length
    ? await db.select().from(organisations).where(inArray(organisations.id, ids))
    : [];
  const members = ids.length
    ? await db
        .select({
          organisationId: organisationMembers.organisationId,
          role: organisationMembers.role,
          displayName: profiles.displayName,
          email: profiles.email,
        })
        .from(organisationMembers)
        .innerJoin(profiles, eq(profiles.id, organisationMembers.profileId))
        .where(inArray(organisationMembers.organisationId, ids))
    : [];

  const [rule, rates, sales] = await Promise.all([
    feeRule(),
    specialRatesOf(ids),
    Promise.all(ids.map((id) => completedSales({ profileId: user.id, organisationId: id }))),
  ]);
  const rateText = (bp: number) => formatPercent(bp / 100, locale);
  const sideText = (side: "seller" | "buyer") => (side === "seller" ? tf("sideSeller") : tf("sideBuyer"));

  const types = [
    { value: "lab", label: locale === "de" ? "Labor" : "Laboratory" },
    { value: "university", label: locale === "de" ? "Universität" : "University" },
    { value: "company", label: locale === "de" ? "Unternehmen" : "Company" },
    { value: "dealer", label: locale === "de" ? "Händler" : "Dealer" },
    { value: "service_provider", label: locale === "de" ? "Dienstleister" : "Service provider" },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("organisation")}</h1>

      {rows.map((organisation) => {
        const isOwner = user.organisations.find((o) => o.id === organisation.id)?.role === "owner";
        return (
          <Card key={organisation.id}>
            <CardHeader
              title={organisation.name}
              description={`${organisation.city ?? ""} ${organisation.country}`.trim()}
              action={
                organisation.verifiedAt ? (
                  <Badge tone="success">{locale === "de" ? "Verifiziert" : "Verified"}</Badge>
                ) : null
              }
            />
            <CardBody className="space-y-4">
              {organisation.about ? (
                <p className="text-sm leading-relaxed text-fg-muted">{organisation.about}</p>
              ) : null}
              <div>
                <h3 className="mb-2 text-sm font-medium text-fg">{t("members")}</h3>
                <ul className="space-y-1.5 text-sm">
                  {members
                    .filter((member) => member.organisationId === organisation.id)
                    .map((member) => (
                      <li key={member.email} className="flex items-center justify-between gap-2">
                        <span className="text-fg">{member.displayName}</span>
                        <span className="flex items-center gap-2 text-xs text-fg-subtle">
                          {member.email}
                          <Badge tone={member.role === "owner" ? "primary" : "neutral"}>{member.role}</Badge>
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
              {isOwner ? (
                <AddMemberForm
                  locale={locale}
                  organisationId={organisation.id}
                  labels={{
                    email: tc("search") === "Search" ? "Email" : "E-Mail",
                    invite: t("invite"),
                    saved: t("saved"),
                    notFound: locale === "de" ? "Kein Konto mit dieser Adresse." : "No account with that address.",
                  }}
                />
              ) : null}
              {(() => {
                const own = rates.filter((row) => row.organisationId === organisation.id);
                const approved = (side: "seller" | "buyer") =>
                  own.find((row) => row.side === side && row.status === "approved" && row.rateBp !== null);
                const open = (side: "seller" | "buyer") =>
                  own.find((row) => row.side === side && row.status === "requested");
                const rejected = own.find((row) => row.status === "rejected");
                const completed = sales[ids.indexOf(organisation.id)] ?? 0;
                const tier = tierRate(rule.sellerPercent, rule.sellerTiers, completed);
                const next = nextTier(rule.sellerPercent, rule.sellerTiers, completed);
                const sellerRate = approved("seller");
                const buyerRate = approved("buyer");
                // Selling at a special rate is for dealers; buying at one, for any organisation.
                const sides = (organisation.type === "dealer" ? (["seller", "buyer"] as const) : (["buyer"] as const))
                  .filter((side) => !open(side))
                  .map((side) => ({ value: side, label: sideText(side) }));
                return (
                  <div className="space-y-2 border-t border-border pt-4">
                    <h3 className="text-sm font-medium text-fg">{tf("orgTitle")}</h3>
                    <ul className="space-y-1 text-sm text-fg-muted">
                      <li>
                        <span className="text-fg">{tf("selling")}:</span>{" "}
                        {sellerRate
                          ? tf("specialSince", {
                              rate: rateText(sellerRate.rateBp!),
                              date: formatDate(sellerRate.decidedAt, locale),
                            })
                          : `${rateText(tier)} · ${tf("sales", { count: completed })} · ${
                              next ? tf("nextSales", { count: next.at, rate: rateText(next.rateBp) }) : tf("lowest")
                            }`}
                      </li>
                      <li>
                        <span className="text-fg">{tf("buying")}:</span>{" "}
                        {buyerRate
                          ? tf("specialSince", {
                              rate: rateText(buyerRate.rateBp!),
                              date: formatDate(buyerRate.decidedAt, locale),
                            })
                          : tf("orgBuyingMembers")}
                      </li>
                    </ul>
                    {(["seller", "buyer"] as const).map((side) => {
                      const request = open(side);
                      return request ? (
                        <p key={side} className="rounded-[var(--radius-md)] bg-info-subtle px-3 py-2 text-sm text-info">
                          {tf("pending", { side: sideText(side), date: formatDate(request.createdAt, locale) })}
                        </p>
                      ) : null;
                    })}
                    {rejected && !open(rejected.side) ? (
                      <p className="text-xs text-fg-subtle">
                        {tf("rejected", { side: sideText(rejected.side), date: formatDate(rejected.decidedAt, locale) })}
                        {rejected.decisionNote ? ` ${rejected.decisionNote}` : ""}
                      </p>
                    ) : null}
                    {isOwner && sides.length ? (
                      <details className="rounded-[var(--radius-md)] border border-border p-3">
                        <summary className="cursor-pointer text-sm font-medium text-primary">{tf("requestTitle")}</summary>
                        <div className="mt-3 space-y-3">
                          <p className="text-xs text-fg-subtle">{tf("requestIntro")}</p>
                          <SpecialRateRequestForm
                            locale={locale}
                            organisationId={organisation.id}
                            sides={sides}
                            labels={{
                              side: tf("requestSide"),
                              expectedPerYear: tf("expectedPerYear"),
                              message: tf("message"),
                              submit: tf("submit"),
                              requested: tf("requested"),
                              already_requested: tf("errorAlreadyRequested"),
                              not_dealer: tf("errorNotDealer"),
                              generic: tc("error"),
                            }}
                          />
                        </div>
                      </details>
                    ) : null}
                  </div>
                );
              })()}
              <p className="text-xs text-fg-subtle">
                <Link href={`/${locale}/anbieter/${organisation.slug}`} className="text-primary hover:underline">
                  {locale === "de" ? "Öffentliches Profil ansehen" : "View public profile"} →
                </Link>
              </p>
            </CardBody>
          </Card>
        );
      })}

      <Card>
        <CardHeader title={t("createOrganisation")} />
        <CardBody>
          <CreateOrganisationForm
            locale={locale}
            types={types}
            labels={{
              organisationName: t("organisationName"),
              organisationType: t("organisationType"),
              city: t("city"),
              country: t("country"),
              about: t("bio"),
              createOrganisation: t("createOrganisation"),
              error: tc("error"),
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { organisationMembers, organisations, profiles } from "@/db/schema/identity";
import { requireUser } from "@/auth/session";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { Card, CardBody, CardHeader } from "@/ui/card";
import { AddMemberForm, CreateOrganisationForm } from "@/ui/profile-forms";

export const metadata = { robots: { index: false } };

export default async function OrganisationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "account" });
  const tc = await getTranslations({ locale, namespace: "common" });

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

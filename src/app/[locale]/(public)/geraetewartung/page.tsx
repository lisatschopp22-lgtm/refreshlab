import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { and, asc, inArray, isNull, sql } from "drizzle-orm";
import { BadgeCheck, Gauge, MapPin, ShieldCheck, Wrench, Cog } from "lucide-react";
import { currentUser } from "@/auth/session";
import { db } from "@/db/client";
import { organisations } from "@/db/schema/identity";
import type { Locale } from "@/i18n/routing";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { ButtonLink } from "@/ui/button";
import { Card, CardBody, Section } from "@/ui/card";
import { PageHero } from "@/ui/page-hero";
import { ServiceRequestForm } from "@/ui/service-request-form";
import { serviceFormLabels } from "@/ui/service-form-labels";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "maintenance" });
  return { title: t("title"), description: t("description") };
}

export default async function MaintenancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "maintenance" });
  const [user, providers] = await Promise.all([
    currentUser(),
    // Workshops and refurbishers that are on refreshLab, verified ones first.
    db
      .select({
        id: organisations.id,
        name: organisations.name,
        slug: organisations.slug,
        city: organisations.city,
        country: organisations.country,
        about: organisations.about,
        verified: sql<boolean>`${organisations.verifiedAt} is not null`,
      })
      .from(organisations)
      .where(and(inArray(organisations.type, ["service_provider", "dealer"]), isNull(organisations.suspendedAt)))
      .orderBy(sql`${organisations.verifiedAt} is null`, asc(organisations.name)),
  ]);

  const services = [
    { icon: Wrench, title: t("service1Title"), text: t("service1Text") },
    { icon: Gauge, title: t("service2Title"), text: t("service2Text") },
    { icon: ShieldCheck, title: t("service3Title"), text: t("service3Text") },
    { icon: Cog, title: t("service4Title"), text: t("service4Text"), href: `/${locale}/ersatzteillager`, link: t("service4Link") },
  ];

  return (
    <main>
      <PageHero
        kicker={t("kicker")}
        title={t("title")}
        lead={t("lead")}
        top={
          <Breadcrumbs
            items={[
              { name: "refreshLab", href: `/${locale}` },
              { name: t("title"), href: `/${locale}/geraetewartung` },
            ]}
          />
        }
      >
        <ButtonLink href="#anfrage" size="lg">
          <Wrench className="size-5" aria-hidden="true" />
          {t("cta")}
        </ButtonLink>
      </PageHero>

      <div className="mx-auto max-w-[1200px] space-y-14 px-4 py-12">
        <Section title={t("servicesTitle")} description={t("servicesText")}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <li key={service.title}>
                <Card className="h-full">
                  <CardBody className="flex h-full flex-col gap-2">
                    <span className="flex size-10 items-center justify-center rounded-[var(--radius-full)] bg-primary-subtle">
                      <service.icon className="size-5 text-primary" aria-hidden="true" />
                    </span>
                    <h3 className="pt-1 font-semibold text-fg">{service.title}</h3>
                    <p className="flex-1 text-sm leading-relaxed text-fg-muted">{service.text}</p>
                    {service.href ? (
                      <Link href={service.href} className="text-sm font-medium text-primary hover:underline">
                        {service.link} →
                      </Link>
                    ) : null}
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t("providersTitle")} description={t("providersText")}>
          {providers.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {providers.map((provider) => (
                <li key={provider.id}>
                  <Card className="h-full">
                    <CardBody className="space-y-2">
                      <Link href={`/${locale}/anbieter/${provider.slug}`} className="font-semibold text-fg hover:underline">
                        {provider.name}
                      </Link>
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" aria-hidden="true" />
                          {[provider.city, provider.country].filter(Boolean).join(", ")}
                        </span>
                        {provider.verified ? (
                          <span className="inline-flex items-center gap-1 text-success">
                            <BadgeCheck className="size-3.5" aria-hidden="true" />
                            {t("verified")}
                          </span>
                        ) : null}
                      </p>
                      {provider.about ? (
                        <p className="line-clamp-3 text-sm leading-relaxed text-fg-muted">{provider.about}</p>
                      ) : null}
                    </CardBody>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fg-subtle">{t("providersEmpty")}</p>
          )}
        </Section>

        <section id="anfrage" className="grid scroll-mt-32 gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t("formTitle")}</h2>
            <p className="mt-3 leading-relaxed text-fg-muted">{t("formText")}</p>
          </div>
          <Card>
            <CardBody>
              <ServiceRequestForm
                kind="maintenance"
                defaults={{ name: user?.displayName, email: user?.email, organisation: user?.organisations[0]?.name }}
                fields={[
                  {
                    name: "instrument",
                    label: t("instrument"),
                    type: "text",
                    required: true,
                    placeholder: t("instrumentPlaceholder"),
                  },
                  {
                    name: "serviceType",
                    label: t("serviceType"),
                    type: "select",
                    options: ["typeMaintenance", "typeRepair", "typeCalibration", "typeQualification", "typeUnsure"].map(
                      (key) => ({ value: t(key), label: t(key) }),
                    ),
                  },
                ]}
                labels={await serviceFormLabels(locale)}
              />
            </CardBody>
          </Card>
        </section>
      </div>
    </main>
  );
}

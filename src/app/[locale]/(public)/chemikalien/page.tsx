import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Ban, CircleCheck, FlaskConical, Info, Send, ShieldCheck, Truck, UserCheck } from "lucide-react";
import { currentUser } from "@/auth/session";
import type { Locale } from "@/i18n/routing";
import { Breadcrumbs } from "@/ui/breadcrumbs";
import { ButtonLink } from "@/ui/button";
import { Card, CardBody, Section } from "@/ui/card";
import { PageHero } from "@/ui/page-hero";
import { ServiceRequestForm } from "@/ui/service-request-form";
import { serviceFormLabels } from "@/ui/service-form-labels";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "chemicals" });
  return { title: t("title"), description: t("description") };
}

/**
 * Chemicals are not listed like everything else: unopened original
 * containers can be reported to refreshLab, which checks each one and passes
 * it on only between organisations.
 */
export default async function ChemicalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "chemicals" });
  const user = await currentUser();

  const allowed = ["allowed1", "allowed2", "allowed3", "allowed4"].map((key) => t(key));
  const excluded = ["excluded1", "excluded2", "excluded3", "excluded4", "excluded5"].map((key) => t(key));
  const steps = [
    { icon: Send, title: t("step1Title"), text: t("step1Text") },
    { icon: ShieldCheck, title: t("step2Title"), text: t("step2Text") },
    { icon: UserCheck, title: t("step3Title"), text: t("step3Text") },
    { icon: Truck, title: t("step4Title"), text: t("step4Text") },
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
              { name: t("title"), href: `/${locale}/chemikalien` },
            ]}
          />
        }
      >
        <ButtonLink href="#anfrage" size="lg">
          <FlaskConical className="size-5" aria-hidden="true" />
          {t("cta")}
        </ButtonLink>
      </PageHero>

      <div className="mx-auto max-w-[1200px] space-y-14 px-4 py-12">
        <ul className="grid gap-4 md:grid-cols-2">
          <li>
            <Card className="h-full">
              <CardBody className="space-y-3">
                <CircleCheck className="size-5 text-success" aria-hidden="true" />
                <h2 className="font-semibold text-fg">{t("allowedTitle")}</h2>
                <ul className="space-y-1.5 text-sm text-fg-muted">
                  {allowed.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden="true" className="text-success">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </li>
          <li>
            <Card className="h-full">
              <CardBody className="space-y-3">
                <Ban className="size-5 text-danger" aria-hidden="true" />
                <h2 className="font-semibold text-fg">{t("excludedTitle")}</h2>
                <ul className="space-y-1.5 text-sm text-fg-muted">
                  {excluded.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden="true" className="text-danger">✕</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </li>
        </ul>

        <Section title={t("stepsTitle")}>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step.title}>
                <Card className="h-full">
                  <CardBody className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <span className="tabular flex size-8 items-center justify-center rounded-[var(--radius-full)] bg-primary-subtle text-sm font-bold text-primary-subtle-fg">
                        {index + 1}
                      </span>
                      <step.icon className="size-5 text-primary" aria-hidden="true" />
                    </div>
                    <h3 className="pt-1 font-semibold text-fg">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-fg-muted">{step.text}</p>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ol>
        </Section>

        <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-info-subtle px-4 py-3 text-sm text-info">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t("legalNote")}
        </p>

        <section id="anfrage" className="grid scroll-mt-32 gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t("formTitle")}</h2>
            <p className="mt-3 leading-relaxed text-fg-muted">{t("formText")}</p>
          </div>
          <Card>
            <CardBody>
              <ServiceRequestForm
                kind="chemicals"
                organisationRequired
                defaults={{ name: user?.displayName, email: user?.email, organisation: user?.organisations[0]?.name }}
                fields={[
                  { name: "substance", label: t("substance"), type: "text", required: true, placeholder: t("substancePlaceholder") },
                  { name: "cas", label: t("cas"), type: "text", placeholder: "64-17-5" },
                  { name: "quantity", label: t("quantity"), type: "text", required: true, placeholder: t("quantityPlaceholder") },
                  { name: "expiry", label: t("expiry"), type: "text", placeholder: t("expiryPlaceholder") },
                  { name: "sealed", label: t("sealed"), type: "check", required: true },
                  { name: "sds", label: t("sds"), type: "check", required: true },
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

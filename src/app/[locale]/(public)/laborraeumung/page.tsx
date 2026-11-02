import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClipboardList, Coins, FileCheck2, PackageOpen, Recycle, Tags, Timer, Truck } from "lucide-react";
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
  const t = await getTranslations({ locale, namespace: "labClearance" });
  return { title: t("title"), description: t("description") };
}

export default async function LabClearancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "labClearance" });
  const user = await currentUser();

  const steps = [
    { icon: ClipboardList, title: t("step1Title"), text: t("step1Text") },
    { icon: Tags, title: t("step2Title"), text: t("step2Text") },
    { icon: Truck, title: t("step3Title"), text: t("step3Text") },
    { icon: Recycle, title: t("step4Title"), text: t("step4Text") },
  ];
  const benefits = [
    { icon: Coins, title: t("benefit1Title"), text: t("benefit1Text") },
    { icon: Timer, title: t("benefit2Title"), text: t("benefit2Text") },
    { icon: FileCheck2, title: t("benefit3Title"), text: t("benefit3Text") },
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
              { name: t("title"), href: `/${locale}/laborraeumung` },
            ]}
          />
        }
      >
        <ButtonLink href="#anfrage" size="lg">
          <PackageOpen className="size-5" aria-hidden="true" />
          {t("cta")}
        </ButtonLink>
      </PageHero>

      <div className="mx-auto max-w-[1200px] space-y-14 px-4 py-12">
        <Section title={t("stepsTitle")} description={t("stepsText")}>
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

        <Section title={t("benefitsTitle")}>
          <ul className="grid gap-6 md:grid-cols-3">
            {benefits.map((benefit) => (
              <li key={benefit.title} className="flex gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-success-subtle">
                  <benefit.icon className="size-5 text-success" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-semibold text-fg">{benefit.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-fg-muted">{benefit.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <section id="anfrage" className="grid scroll-mt-32 gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t("formTitle")}</h2>
            <p className="mt-3 leading-relaxed text-fg-muted">{t("formText")}</p>
          </div>
          <Card>
            <CardBody>
              <ServiceRequestForm
                kind="lab_clearance"
                defaults={{ name: user?.displayName, email: user?.email, organisation: user?.organisations[0]?.name }}
                fields={[
                  { name: "timeframe", label: t("timeframe"), type: "text", placeholder: t("timeframePlaceholder") },
                  {
                    name: "scope",
                    label: t("scope"),
                    type: "select",
                    options: ["scopeSmall", "scopeMedium", "scopeLarge", "scopeWhole"].map((key) => ({
                      value: t(key),
                      label: t(key),
                    })),
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

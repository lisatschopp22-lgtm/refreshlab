import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowRight,
  BadgeCheck,
  Leaf,
  Microscope,
  Recycle,
  RefreshCw,
  Sprout,
  Tag,
  Telescope,
  TestTubes,
  Wrench,
} from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { buttonClass } from "@/ui/button";
import { readDesignPrefs } from "@/ui/design-prefs.server";
import { LabIllustration } from "@/ui/lab-illustration";
import { LocaleSwitch } from "@/ui/site/locale-switch";
import { SwitchableLogo } from "@/ui/site/logo-switchable";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "opener" });
  // The marketplace home is the page to index; this is only its front door.
  return { title: t("metaTitle"), description: t("text"), robots: { index: false, follow: true } };
}

/**
 * The opener: what a visitor sees first when they come to the site without a
 * path. What refreshLab is, why reuse matters, and a single way in at the
 * bottom. Links inside the site lead to the marketplace home, so nobody has
 * to pass it twice.
 */
export default async function OpenerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "opener" });
  const prefs = await readDesignPrefs();

  // What is left over after a project, in the three parts of the marketplace.
  const leftovers = [
    { icon: Microscope, title: t("devicesTitle"), text: t("devicesText"), link: t("devicesLink"), href: `/${locale}/suche` },
    { icon: Wrench, title: t("partsTitle"), text: t("partsText"), link: t("partsLink"), href: `/${locale}/ersatzteillager` },
    {
      icon: TestTubes,
      title: t("consumablesTitle"),
      text: t("consumablesText"),
      link: t("consumablesLink"),
      href: `/${locale}/verbrauchsmaterialien`,
    },
  ];
  const steps = [
    { icon: Tag, title: t("step1Title"), text: t("step1Text") },
    { icon: BadgeCheck, title: t("step2Title"), text: t("step2Text") },
    { icon: Telescope, title: t("step3Title"), text: t("step3Text") },
  ];
  const values = [
    { icon: Leaf, title: t("value1Title"), text: t("value1Text") },
    { icon: RefreshCw, title: t("value2Title"), text: t("value2Text") },
    { icon: Sprout, title: t("value3Title"), text: t("value3Text") },
  ];

  return (
    <main className="relative min-h-svh overflow-hidden bg-bg-elevated text-fg">
      {/* Daylight from above and a large, slow recycling mark behind the first screen. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(ellipse_at_top,var(--primary-subtle),transparent_70%)]"
      />
      <Recycle
        aria-hidden="true"
        strokeWidth={0.6}
        className="pointer-events-none absolute -right-40 -top-32 size-[38rem] text-primary opacity-[0.07] motion-safe:animate-[spin_180s_linear_infinite]"
      />

      <div className="relative mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 py-4">
        <SwitchableLogo initial={prefs.logo} />
        <LocaleSwitch locale={locale} />
      </div>

      {/* What refreshLab is */}
      <section className="relative mx-auto grid w-full max-w-[1200px] items-center gap-10 px-4 pb-16 pt-6 md:grid-cols-[1.05fr_1fr] md:pt-12">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] bg-primary-subtle px-3 py-1 text-sm font-medium text-primary-subtle-fg">
            <Recycle className="size-4" aria-hidden="true" />
            {t("kicker")}
          </span>
          <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t("title")}</h1>
          <p className="mt-4 text-balance text-xl font-semibold leading-snug text-primary sm:text-2xl">{t("slogan")}</p>
          <p className="mt-5 max-w-xl leading-relaxed text-fg-muted">{t("text")}</p>
        </div>
        <LabIllustration title={t("imageAlt")} className="mx-auto max-w-xl" />
      </section>

      {/* Project work: what one lab has left, another is missing */}
      <section className="relative mx-auto w-full max-w-[1200px] px-4 pb-16">
        <div className="mx-auto max-w-2xl text-center">
          <Recycle className="mx-auto size-7 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{t("projectTitle")}</h2>
          <p className="mt-3 leading-relaxed text-fg-muted">{t("projectText")}</p>
        </div>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {leftovers.map((item) => (
            <li key={item.title} className="flex flex-col rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-5">
              <span className="flex size-11 items-center justify-center rounded-[var(--radius-full)] bg-primary-subtle">
                <item.icon className="size-5 text-primary" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-fg">{item.title}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-fg-muted">{item.text}</p>
              <Link href={item.href} className="mt-4 text-sm font-medium text-primary hover:underline">
                {item.link} →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* The cycle */}
      <section className="relative border-y border-border bg-primary-subtle/40">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <RefreshCw className="mx-auto size-7 text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{t("cycleTitle")}</h2>
            <p className="mt-3 leading-relaxed text-fg-muted">{t("cycleText")}</p>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="relative rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="tabular flex size-9 items-center justify-center rounded-[var(--radius-full)] bg-primary-subtle text-sm font-bold text-primary-subtle-fg">
                    {index + 1}
                  </span>
                  <step.icon className="size-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-fg">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{step.text}</p>
                {/* The third step leads back to the first: the circle closes. */}
                <Recycle
                  aria-hidden="true"
                  className="absolute right-4 top-4 size-4 text-primary opacity-40"
                />
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why it matters */}
      <section className="relative mx-auto w-full max-w-[1200px] px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <Leaf className="mx-auto size-7 text-success" aria-hidden="true" />
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{t("valuesTitle")}</h2>
          <p className="mt-3 leading-relaxed text-fg-muted">{t("valuesText")}</p>
        </div>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {values.map((value) => (
            <li key={value.title} className="text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-[var(--radius-full)] bg-success-subtle">
                <value.icon className="size-6 text-success" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-fg">{value.title}</h3>
              <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-fg-muted">{value.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* The way in */}
      <section className="relative border-t border-border bg-primary-subtle/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center">
          <Recycle className="size-10 text-primary" aria-hidden="true" />
          <p className="mt-4 text-balance text-2xl font-bold tracking-tight sm:text-3xl">{t("closing")}</p>
          <Link href={`/${locale}`} className={buttonClass("primary", "lg", "mt-8 min-w-64 text-base")}>
            {t("enter")}
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
          <p className="mt-3 text-xs text-fg-subtle">{t("enterHint")}</p>
        </div>
      </section>
    </main>
  );
}

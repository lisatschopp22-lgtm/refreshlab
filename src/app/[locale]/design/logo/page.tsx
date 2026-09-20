import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Card, CardBody, Section } from "@/ui/card";
import { Logo, LogoStacked, logoVariants, markFor, type LogoVariant } from "@/ui/site/logo";
import { LogoMark, markNames } from "@/ui/site/logo-marks";
import { palettes, paletteInk } from "@/ui/design-prefs";

export const metadata = { title: "Logo", robots: { index: false } };

/** What each proposal is arguing, in one line. */
const rationale: Record<LogoVariant, { de: string; en: string }> = {
  wordmark: {
    de: "Nur Schrift. Keine Entscheidung, sondern die Ausgangslage.",
    en: "Type only. Not a decision, just the starting point.",
  },
  brackets: {
    de: "Eckige Klammern wie in einer Summenformel oder einem Datenblatt.",
    en: "Square brackets, as in a chemical formula or a spec sheet.",
  },
  lower: {
    de: "Durchgehend klein, eng gesetzt. Ruhiger, weniger Marktplatz.",
    en: "All lowercase and tight. Quieter, less marketplace.",
  },
  mono: {
    de: "Dicktengleich und gesperrt: liest sich wie eine Gerätekennung.",
    en: "Monospaced and tracked out: reads like an equipment reference.",
  },
  instrument: {
    de: "Das Tischgerät aus der Vorlage, auf vier Teile reduziert.",
    en: "The benchtop instrument from the reference, reduced to four parts.",
  },
  rotor: {
    de: "Ein Rotor von oben. Dreht sich, passt zu „zweite Umdrehung“.",
    en: "A rotor from above. It spins, which matches “a second spin”.",
  },
  flask: {
    de: "Erlenmeyerkolben mit Blasen. Sofort als Labor lesbar.",
    en: "A conical flask with bubbles. Instantly reads as laboratory.",
  },
  spin: {
    de: "Nur der Kreislauf. Am weitesten weg vom Geräte-Klischee.",
    en: "The cycle alone. The furthest from the equipment cliché.",
  },
  hex: {
    de: "Sechsring mit Pfeil: Chemie und Wiederverwendung in einem Zeichen.",
    en: "A six-ring with an arrow: chemistry and reuse in one mark.",
  },
  tag: {
    de: "Inventaretikett. Jedes Gerät hier hat einen Datensatz und eine Historie.",
    en: "An asset tag. Every instrument here carries a record and a history.",
  },
  bench: {
    de: "Die ganze Szene der Vorlage: Geräte auf einer Bank.",
    en: "The whole reference scene: instruments standing on a bench.",
  },
  sprout: {
    de: "Keimling im Reagenzglas. Das zweite Leben, so direkt wie möglich.",
    en: "A sprout in a test tube. The second life, as plainly as possible.",
  },
  balance: {
    de: "Waage. Es geht um den Wert eines Geräts, nicht nur um das Gerät.",
    en: "A balance. This is about what an instrument is worth, not only the instrument.",
  },
  microscope: {
    de: "Mikroskop: die Prüfung, die aus einer Angabe einen Befund macht.",
    en: "A microscope: the inspection that turns a claim into a finding.",
  },
  magnifier: {
    de: "Lupe mit Blasen. Suchen und genau hinsehen, die beiden Kernhandlungen.",
    en: "A magnifier with bubbles. Search and look closely, the two core actions.",
  },
  molecule: {
    de: "Molekül als Netz: Labore, die direkt miteinander handeln.",
    en: "A molecule as a network: labs trading directly with each other.",
  },
  beaker: {
    de: "Becherglas mit Skala. Das gewöhnlichste Objekt in jedem Labor.",
    en: "A graduated beaker. The most ordinary object in any laboratory.",
  },
  badge: {
    de: "Zeichen in einer gefüllten Kachel, für App-Icon und Favicon.",
    en: "The mark in a filled tile, for an app icon and a favicon.",
  },
};

export default async function LogoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const de = locale === "de";

  return (
    <main className="mx-auto max-w-[1100px] space-y-12 px-4 py-12">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-fg-subtle">refreshLab</p>
        <h1 className="text-3xl font-bold tracking-tight">
          {de ? "Logo-Vorschläge" : "Logo proposals"}
        </h1>
        <p className="max-w-2xl text-fg-muted">
          {de
            ? "Achtzehn Varianten, alle aus denselben Tokens. Ein Klick auf eine Variante setzt sie in Kopf- und Fusszeile der ganzen Seite, sodass sie im echten Umfeld beurteilt werden kann."
            : "Eighteen variants, all built from the same tokens. Choosing one puts it in the header and footer of the whole site, so it can be judged where it will actually sit."}
        </p>
        <p className="text-sm text-fg-subtle">
          <Link href={`/${locale}/design`} className="text-primary hover:underline">
            {de ? "← Zum Designsystem" : "← Back to the design system"}
          </Link>
        </p>
      </header>

      <Section
        title={de ? "Varianten" : "Variants"}
        description={
          de
            ? "In der aktuellen Palette und Schrift. Klicken setzt die Variante für die ganze Seite."
            : "In the current palette and typeface. Clicking sets the variant for the whole site."
        }
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {logoVariants.map((variant) => (
            <li key={variant}>
              <Link href={`?logo=${variant}`} className="block h-full">
                <Card className="h-full transition-colors hover:border-[var(--primary)]">
                  <CardBody className="flex h-full flex-col gap-3">
                    <div className="flex min-h-14 items-center">
                      <Logo variant={variant} size="lg" />
                    </div>
                    <div className="mt-auto">
                      <p className="tabular text-xs uppercase tracking-wide text-fg-subtle">
                        {variant}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-fg-muted">
                        {rationale[variant][de ? "de" : "en"]}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title={de ? "Zeichen allein" : "The marks alone"}
        description={
          de
            ? "Bei 20, 32 und 64 Pixeln. Ein Zeichen, das bei 20 px zerfällt, taugt nicht als Favicon."
            : "At 20, 32 and 64 pixels. A mark that falls apart at 20px is no use as a favicon."
        }
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {markNames.map((name) => (
            <li key={name}>
              <Card>
                <CardBody className="flex items-center gap-4">
                  <span className="flex items-end gap-3 text-primary">
                    <span className="block size-16">
                      <LogoMark name={name} />
                    </span>
                    <span className="block size-8">
                      <LogoMark name={name} />
                    </span>
                    <span className="block size-5">
                      <LogoMark name={name} />
                    </span>
                  </span>
                  <span className="tabular ml-auto text-xs text-fg-subtle">{name}</span>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title={de ? "Gestapelt" : "Stacked"}
        description={de ? "Für quadratische Flächen." : "For square spaces."}
      >
        <ul className="flex flex-wrap gap-3">
          {(["instrument", "rotor", "sprout", "balance", "molecule", "spin"] as const).map(
            (variant) => (
              <li key={variant}>
                <Card>
                  <CardBody className="flex size-40 items-center justify-center">
                    <LogoStacked variant={variant} />
                  </CardBody>
                </Card>
              </li>
            ),
          )}
        </ul>
      </Section>

      <Section
        title={de ? "In jeder Palette" : "In every palette"}
        description={
          de
            ? "Dasselbe Zeichen, zwölf Markenfarben. Die Farbe ist noch nicht entschieden."
            : "The same mark in twelve brand colours. The colour is still undecided."
        }
      >
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {palettes.map((value) => (
            <li key={value}>
              <Card>
                <CardBody className="flex flex-col items-center gap-2 py-4">
                  <span
                    className="block size-9"
                    style={{ color: `oklch(0.55 ${paletteInk[value].chroma} ${paletteInk[value].hue})` }}
                  >
                    <LogoMark name={markFor("instrument")!} />
                  </span>
                  <span className="text-xs text-fg-subtle">{value}</span>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}

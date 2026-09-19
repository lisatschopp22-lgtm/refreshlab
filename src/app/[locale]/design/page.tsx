import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { Card, CardBody, CardHeader, Section } from "@/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/ui/field";
import { EmptyState } from "@/ui/empty-state";
import { Table, Td, Th } from "@/ui/table";
import { Tabs } from "@/ui/tabs";
import { Pagination } from "@/ui/pagination";
import { ClaimSource, ConditionBadge, LocationLine, SellerLine, VerifiedBadge, WarrantyBadge } from "@/ui/trust";
import { conditions } from "@/domain/conditions";
import { formatMoney } from "@/i18n/format";

export const metadata = { title: "Design system", robots: { index: false } };

// Literal class names: Tailwind scans source text, so a template string would
// simply not generate the utility.
const swatches: { token: string; className: string }[] = [
  { token: "bg", className: "bg-bg text-fg" },
  { token: "bg-subtle", className: "bg-bg-subtle text-fg" },
  { token: "bg-sunken", className: "bg-bg-sunken text-fg" },
  { token: "bg-elevated", className: "bg-bg-elevated text-fg" },
  { token: "primary", className: "bg-primary text-primary-fg" },
  { token: "primary-subtle", className: "bg-primary-subtle text-primary-subtle-fg" },
  { token: "accent", className: "bg-accent text-bg" },
  { token: "accent-subtle", className: "bg-accent-subtle text-fg" },
  { token: "success", className: "bg-success text-bg" },
  { token: "success-subtle", className: "bg-success-subtle text-success" },
  { token: "warning", className: "bg-warning text-bg" },
  { token: "warning-subtle", className: "bg-warning-subtle text-warning" },
  { token: "danger", className: "bg-danger text-bg" },
  { token: "danger-subtle", className: "bg-danger-subtle text-danger" },
  { token: "info", className: "bg-info text-bg" },
  { token: "info-subtle", className: "bg-info-subtle text-info" },
  { token: "fg-inverse on bg-inverse", className: "bg-bg-inverse text-fg-inverse" },
];

const brandRamp = [
  { token: "brand-50", className: "bg-brand-50" },
  { token: "brand-100", className: "bg-brand-100" },
  { token: "brand-500", className: "bg-brand-500" },
  { token: "brand-700", className: "bg-brand-700" },
  { token: "brand-900", className: "bg-brand-900" },
];

export default async function DesignPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "design" });

  return (
    <main className="mx-auto max-w-[1100px] space-y-14 px-4 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="max-w-2xl text-fg-muted">{t("subtitle")}</p>
        <p className="text-sm text-fg-subtle">
          Bottom right: palette, appearance, typeface and density. Any page also
          accepts <code className="tabular">?palette=ember</code> or{" "}
          <code className="tabular">?theme=dark</code>.
        </p>
      </header>

      <Section title={t("colours")}>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {swatches.map((swatch) => (
            <li
              key={swatch.token}
              className={`rounded-[var(--radius-md)] border border-border p-3 ${swatch.className}`}
            >
              <span className="tabular text-xs">--{swatch.token}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-1">
          {brandRamp.map((step) => (
            <div
              key={step.token}
              className={`h-12 flex-1 rounded-[var(--radius-sm)] ${step.className}`}
              title={step.token}
            />
          ))}
        </div>
      </Section>

      <Section title={t("typography")}>
        <Card>
          <CardBody className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight">Das nächste Gerät steht im Nachbarlabor</h1>
            <h2 className="text-2xl font-semibold">Eppendorf Centrifuge 5810 R</h2>
            <h3 className="text-lg font-semibold">Technische Daten</h3>
            <p className="max-w-2xl text-fg-muted">
              Fliesstext in der Grundgrösse. Er muss auf einer Modellseite über mehrere
              Absätze ruhig lesbar bleiben, auch wenn daneben eine dichte Tabelle steht.
            </p>
            <p className="tabular text-sm">RL-EQ-004281 · SER. 75007203-1984 · CHF 8&apos;400</p>
          </CardBody>
        </Card>
      </Section>

      <Section title={t("controls")}>
        <div className="flex flex-wrap items-center gap-2">
          <Button>Kaufen</Button>
          <Button variant="secondary">Angebot machen</Button>
          <Button variant="subtle">Merken</Button>
          <Button variant="ghost">Teilen</Button>
          <Button variant="danger">Löschen</Button>
          <Button disabled>Nicht verfügbar</Button>
          <Button size="sm">Klein</Button>
          <Button size="lg">Gross</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Modell" hint="Beginnen Sie mit dem Hersteller." htmlFor="d1">
            <Input id="d1" placeholder="Eppendorf 5810 R" />
          </Field>
          <Field label="Zustand" htmlFor="d2">
            <Select id="d2" defaultValue="good">
              {conditions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Preis" error="Bitte einen Betrag in CHF angeben." htmlFor="d3" required>
            <Input id="d3" defaultValue="abc" />
          </Field>
          <Field label="Beschreibung" htmlFor="d4">
            <Textarea id="d4" placeholder="Nennen Sie auch Mängel." />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox defaultChecked /> Nur geprüfte Geräte
        </label>
        <Tabs
          items={[
            { href: "#", label: "Übersicht", active: true },
            { href: "#", label: "Technische Daten" },
            { href: "#", label: "Fragen", count: 7 },
          ]}
        />
      </Section>

      <Section title={t("trustElements")}>
        <div className="flex flex-wrap items-center gap-2">
          <VerifiedBadge />
          {conditions.map((c) => (
            <ConditionBadge key={c} condition={c} />
          ))}
          <ConditionBadge condition="good" inspected />
          <WarrantyBadge months={12} />
          <Badge tone="warning">Reserviert</Badge>
          <Badge tone="outline">Entwurf</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <LocationLine city="Basel" country="CH" />
          <SellerLine sellerName="Beat Hunziker" organisationName="LifeScience Basel AG" organisationVerified />
          <ClaimSource inspected={false} />
          <ClaimSource inspected />
        </div>
        <Card>
          <CardHeader
            title="Zustand & Lieferumfang"
            description="Angaben der verkaufenden Person und geprüfte Befunde bleiben getrennt."
            action={<ShieldCheck className="size-4 text-success" />}
          />
          <CardBody className="space-y-2 text-sm text-fg-muted">
            <p>Technisch geprüft, leichte Gebrauchsspuren. Inklusive TX-150 Rotor.</p>
            <p className="tabular">{formatMoney(840_000, "CHF", locale)}</p>
          </CardBody>
        </Card>
      </Section>

      <Section title={t("dataDisplay")}>
        <Table>
          <thead>
            <tr>
              <Th>Merkmal</Th>
              <Th>Wert</Th>
              <Th>Quelle</Th>
            </tr>
          </thead>
          <tbody>
            <tr><Td>Max. RZB</Td><Td className="tabular">20&apos;913 × g</Td><Td><ClaimSource inspected /></Td></tr>
            <tr><Td>Kühlung</Td><Td>-9 bis 40 °C</Td><Td><ClaimSource inspected /></Td></tr>
            <tr><Td>Betriebsstunden</Td><Td className="tabular">3&apos;280 h</Td><Td><ClaimSource inspected={false} /></Td></tr>
          </tbody>
        </Table>
        <Pagination
          page={2}
          pageCount={7}
          hrefFor={(p) => `?page=${p}`}
          labels={{ previous: "Zurück", next: "Weiter", page: "Seite", of: "von" }}
        />
        <EmptyState
          title="Keine passenden Geräte"
          description="Nichts gefunden. Selbst die Zentrifuge dreht sich hier im Leeren."
          action={<Button variant="secondary" size="sm">Filter zurücksetzen</Button>}
        />
      </Section>
    </main>
  );
}

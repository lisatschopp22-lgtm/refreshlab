import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/auth/session";
import { organisationsForSpecialRates, specialRateOverview } from "@/db/queries/special-rates";
import { specialRateAdminAction } from "@/actions/special-rates";
import { formatDate, formatPercent } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/ui/badge";
import { buttonClass } from "@/ui/button";
import { Card, CardBody, CardHeader } from "@/ui/card";
import { Input, Select } from "@/ui/field";
import { Table, Td, Th } from "@/ui/table";

export default async function AdminSpecialRatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const { error } = await searchParams;

  const t = await getTranslations({ locale, namespace: "admin" });
  const [overview, candidates] = await Promise.all([specialRateOverview(), organisationsForSpecialRates()]);

  const sideLabel = (side: "seller" | "buyer") => (side === "seller" ? t("sideSeller") : t("sideBuyer"));
  const rate = (bp: number | null) => (bp === null ? "–" : formatPercent(bp / 100, locale));
  const errors: Record<string, string> = {
    not_dealer: t("errorNotDealer"),
    invalid_rate: t("errorInvalidRate"),
    not_open: t("errorNotOpen"),
  };
  const hidden = (intent: string, id?: string) => (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="intent" value={intent} />
      {id ? <input type="hidden" name="id" value={id} /> : null}
    </>
  );
  const percentInput = (defaultValue?: string) => (
    <Input
      name="percent"
      type="number"
      step="0.05"
      min="0"
      max="100"
      required
      defaultValue={defaultValue}
      aria-label={t("ratePercent")}
      placeholder="%"
      className="h-8 w-20"
    />
  );
  const noteInput = (
    <Input name="note" aria-label={t("note")} placeholder={t("note")} className="h-8 w-40" />
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t("specialRates")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-fg-muted">{t("specialRatesIntro")}</p>
      </div>

      {error ? (
        <p className="rounded-[var(--radius-md)] bg-danger-subtle px-3 py-2 text-sm text-danger" role="alert">
          {errors[error] ?? t("errorInvalidRate")}
        </p>
      ) : null}

      <Card>
        <CardHeader title={t("openRequests")} />
        {overview.open.length ? (
          <CardBody className="p-0">
            <Table>
              <thead>
                <tr>
                  <Th>{t("organisation")}</Th>
                  <Th>{t("side")}</Th>
                  <Th>{t("expectedPerYear")}</Th>
                  <Th>{t("action")}</Th>
                </tr>
              </thead>
              <tbody>
                {overview.open.map((row) => (
                  <tr key={row.id}>
                    <Td>
                      <Link href={`/${locale}/anbieter/${row.organisationSlug}`} className="text-fg hover:underline">
                        {row.organisationName}
                      </Link>
                      {row.organisationType === "dealer" ? (
                        <Badge tone="neutral" className="ml-2">
                          {t("dealer")}
                        </Badge>
                      ) : null}
                      <p className="text-xs text-fg-subtle">
                        {t("requestedBy", { name: row.requestedByName ?? "–", date: formatDate(row.createdAt, locale) })}
                      </p>
                      {row.message ? <p className="mt-1 max-w-md text-xs text-fg-muted">{row.message}</p> : null}
                    </Td>
                    <Td>{sideLabel(row.side)}</Td>
                    <Td className="tabular">{row.expectedPerYear ?? "–"}</Td>
                    <Td className="space-y-2">
                      <form action={specialRateAdminAction} className="flex flex-wrap items-center gap-2">
                        {hidden("approve", row.id)}
                        {percentInput()}
                        {noteInput}
                        <button type="submit" className={buttonClass("primary", "sm")}>
                          {t("approve")}
                        </button>
                      </form>
                      <form action={specialRateAdminAction} className="flex flex-wrap items-center gap-2">
                        {hidden("reject", row.id)}
                        {noteInput}
                        <button type="submit" className={buttonClass("secondary", "sm")}>
                          {t("reject")}
                        </button>
                      </form>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        ) : (
          <CardBody>
            <p className="text-sm text-fg-subtle">{t("noOpenRequests")}</p>
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader title={t("activeRates")} />
        {overview.active.length ? (
          <CardBody className="p-0">
            <Table>
              <thead>
                <tr>
                  <Th>{t("organisation")}</Th>
                  <Th>{t("side")}</Th>
                  <Th>{t("ratePercent")}</Th>
                  <Th>{t("action")}</Th>
                </tr>
              </thead>
              <tbody>
                {overview.active.map((row) => (
                  <tr key={row.id}>
                    <Td>
                      <span className="text-fg">{row.organisationName}</span>
                      <p className="text-xs text-fg-subtle">
                        {row.decidedAt ? t("since", { date: formatDate(row.decidedAt, locale) }) : null}
                        {row.decisionNote ? ` · ${row.decisionNote}` : ""}
                      </p>
                    </Td>
                    <Td>{sideLabel(row.side)}</Td>
                    <Td className="tabular font-semibold">{rate(row.rateBp)}</Td>
                    <Td className="space-y-2">
                      <form action={specialRateAdminAction} className="flex flex-wrap items-center gap-2">
                        {hidden("change", row.id)}
                        {percentInput(row.rateBp === null ? undefined : String(row.rateBp / 100))}
                        {noteInput}
                        <button type="submit" className={buttonClass("secondary", "sm")}>
                          {t("change")}
                        </button>
                      </form>
                      <form action={specialRateAdminAction}>
                        {hidden("end", row.id)}
                        <button type="submit" className={buttonClass("ghost", "sm")}>
                          {t("end")}
                        </button>
                      </form>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        ) : (
          <CardBody>
            <p className="text-sm text-fg-subtle">{t("noActiveRates")}</p>
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader title={t("grantRate")} description={t("grantRateHint")} />
        <CardBody>
          <form action={specialRateAdminAction} className="flex flex-wrap items-center gap-2">
            {hidden("grant")}
            <Select name="organisationId" aria-label={t("organisation")} className="h-8 w-56" required>
              {candidates.map((organisation) => (
                <option key={organisation.id} value={organisation.id}>
                  {organisation.name}
                  {organisation.type === "dealer" ? ` (${t("dealer")})` : ""}
                </option>
              ))}
            </Select>
            <Select name="side" aria-label={t("side")} className="h-8 w-36">
              <option value="buyer">{t("sideBuyer")}</option>
              <option value="seller">{t("sideSeller")}</option>
            </Select>
            {percentInput()}
            {noteInput}
            <button type="submit" className={buttonClass("primary", "sm")}>
              {t("grant")}
            </button>
          </form>
        </CardBody>
      </Card>

      {overview.history.length ? (
        <Card>
          <CardHeader title={t("history")} />
          <CardBody>
            <ul className="space-y-1.5 text-sm">
              {overview.history.map((row) => (
                <li key={row.id} className="flex flex-wrap items-baseline gap-x-2 text-fg-muted">
                  <span className="text-fg">{row.organisationName}</span>
                  <span>· {sideLabel(row.side)}</span>
                  {row.rateBp !== null ? <span className="tabular">· {rate(row.rateBp)}</span> : null}
                  <span>· {row.status === "rejected" ? t("statusRejected") : t("statusEnded")}</span>
                  <span className="tabular text-xs text-fg-subtle">
                    {formatDate(row.endedAt ?? row.decidedAt ?? row.createdAt, locale)}
                  </span>
                  {row.decisionNote ? <span className="text-xs">· {row.decisionNote}</span> : null}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

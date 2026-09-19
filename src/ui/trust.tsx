import { BadgeCheck, Building2, MapPin, ShieldCheck, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { conditionGrade, conditionTone, type Condition } from "@/domain/conditions";
import { Badge } from "./badge";
import { cn } from "./cn";

/**
 * Trust signals are the same everywhere: a verified badge, a condition grade,
 * location, warranty and whether a finding was declared or independently
 * checked. Built once so a card and a detail page never disagree.
 */

export function ConditionBadge({
  condition,
  inspected,
  showGrade = true,
}: {
  condition: Condition;
  inspected?: boolean;
  showGrade?: boolean;
}) {
  const t = useTranslations("conditions");
  return (
    <Badge tone={conditionTone[condition]}>
      {showGrade ? <span className="tabular font-semibold">{conditionGrade[condition]}</span> : null}
      {t(`${condition}Short`)}
      {inspected ? <ShieldCheck className="size-3" aria-hidden="true" /> : null}
    </Badge>
  );
}

export function VerifiedBadge({ label }: { label?: string }) {
  const t = useTranslations("listing");
  return (
    <Badge tone="success">
      <BadgeCheck className="size-3" aria-hidden="true" />
      {label ?? t("verified")}
    </Badge>
  );
}

export function WarrantyBadge({ months }: { months: number }) {
  const t = useTranslations("listing");
  if (months <= 0) return null;
  return (
    <Badge tone="info">
      <Wrench className="size-3" aria-hidden="true" />
      {t("warrantyMonths", { months })}
    </Badge>
  );
}

export function LocationLine({
  city,
  country,
  className,
}: {
  city: string;
  country: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-fg-muted", className)}>
      <MapPin className="size-3.5" aria-hidden="true" />
      {city}
      <span className="tabular text-fg-subtle">· {country}</span>
    </span>
  );
}

export function SellerLine({
  sellerName,
  organisationName,
  organisationVerified,
  className,
}: {
  sellerName: string;
  organisationName?: string | null;
  organisationVerified?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-fg-muted", className)}>
      {organisationName ? <Building2 className="size-3.5" aria-hidden="true" /> : null}
      {organisationName ?? sellerName}
      {organisationVerified ? <BadgeCheck className="size-3.5 text-success" aria-hidden="true" /> : null}
    </span>
  );
}

/**
 * Keeps a seller's claim visually apart from an independently verified
 * finding. The requirements review treats mixing the two as a defect.
 */
export function ClaimSource({ inspected }: { inspected: boolean }) {
  const t = useTranslations("listing");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[0.6875rem] font-medium",
        inspected ? "bg-success-subtle text-success" : "bg-bg-sunken text-fg-subtle",
      )}
    >
      {inspected ? <ShieldCheck className="size-3" aria-hidden="true" /> : null}
      {inspected ? t("verifiedFinding") : t("declared")}
    </span>
  );
}

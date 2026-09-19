import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { ListingCard as Card } from "@/integrations/search";
import { formatMoney } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { StorageImage } from "./storage-image";
import { ConditionBadge, LocationLine, SellerLine, VerifiedBadge, WarrantyBadge } from "./trust";
import { cn } from "./cn";

export function ListingCardItem({
  listing,
  locale,
  layout = "grid",
}: {
  listing: Card;
  locale: Locale;
  layout?: "grid" | "row";
}) {
  const t = useTranslations("listing");
  const format = useFormatter();
  const href = `/${locale}/geraete/${listing.slug}`;

  const meta = [
    listing.year,
    listing.operatingHours ? `${format.number(listing.operatingHours)} h` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (layout === "row") {
    return (
      <article className="group relative flex gap-4 rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-3 transition-shadow hover:shadow-[var(--shadow-md)]">
        <div className="relative aspect-[4/3] w-40 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-bg-sunken">
          <StorageImage path={listing.imagePath} alt={listing.imageAlt ?? listing.title} sizes="160px" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {listing.verifiedAt ? <VerifiedBadge /> : null}
            <ConditionBadge condition={listing.condition} inspected={!!listing.inspectedAt} />
            <WarrantyBadge months={listing.warrantyMonths} />
          </div>
          <h3 className="truncate text-[0.9375rem] font-semibold text-fg">
            <Link href={href} className="after:absolute after:inset-0">
              {listing.title}
            </Link>
          </h3>
          <p className="truncate text-sm text-fg-muted">
            {meta}
            {meta ? " · " : ""}
            <LocationLine city={listing.locationCity} country={listing.locationCountry} />
          </p>
          <div className="mt-auto flex items-end justify-between gap-3 pt-1">
            <SellerLine
              sellerName={listing.sellerName}
              organisationName={listing.organisationName}
              organisationVerified={listing.organisationVerified}
              className="truncate text-xs"
            />
            <p className="tabular shrink-0 text-base font-semibold text-fg">
              {formatMoney(listing.priceCents, listing.currency, locale)}
            </p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border",
        "bg-bg-elevated transition-shadow hover:shadow-[var(--shadow-md)]",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-bg-sunken">
        <StorageImage
          path={listing.imagePath}
          alt={listing.imageAlt ?? listing.title}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {listing.featured ? (
          <span className="absolute left-2 top-2 rounded-[var(--radius-sm)] bg-bg-inverse/85 px-1.5 py-0.5 text-[0.6875rem] font-medium text-fg-inverse">
            {t("verified")}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {listing.verifiedAt ? <VerifiedBadge /> : null}
          <ConditionBadge condition={listing.condition} inspected={!!listing.inspectedAt} />
          <WarrantyBadge months={listing.warrantyMonths} />
        </div>
        <h3 className="text-[0.9375rem] font-semibold leading-snug text-fg">
          <Link href={href} className="after:absolute after:inset-0">
            {listing.title}
          </Link>
        </h3>
        <p className="text-sm text-fg-muted">
          {meta}
          {meta ? " · " : ""}
          {listing.locationCity}
        </p>
        <div className="mt-auto space-y-1.5 pt-1.5">
          <p className="tabular text-lg font-semibold text-fg">
            {formatMoney(listing.priceCents, listing.currency, locale)}
          </p>
          <SellerLine
            sellerName={listing.sellerName}
            organisationName={listing.organisationName}
            organisationVerified={listing.organisationVerified}
            className="truncate text-xs"
          />
        </div>
      </div>
    </article>
  );
}

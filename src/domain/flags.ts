/**
 * Behaviours that are still open questions. Each one can be flipped without a
 * code change so alternatives can be compared instead of argued about.
 * Env overrides win; admin settings are read on top of these in settings.ts.
 */
export type Flags = {
  /** Allow "make an offer" alongside a fixed price. */
  offersEnabled: boolean;
  /** Buy now without negotiation. */
  buyNowEnabled: boolean;
  /** New listings need admin approval before they go public. */
  requireListingReview: boolean;
  /** Public Q&A on individual listings (as well as on equipment models). */
  commentsOnListings: boolean;
  /** Show the market price range derived from listings on a model page. */
  showPriceRangeOnModel: boolean;
  /** Buyer confirmation releases the payout; otherwise an admin does. */
  buyerConfirmsReceipt: boolean;
  /** Show the dev theme/palette switcher. */
  showDesignSwitcher: boolean;
};

export const defaultFlags: Flags = {
  offersEnabled: true,
  buyNowEnabled: true,
  requireListingReview: false,
  commentsOnListings: true,
  showPriceRangeOnModel: true,
  buyerConfirmsReceipt: true,
  showDesignSwitcher: true,
};

function envFlag(name: string): boolean | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  return raw === "1" || raw.toLowerCase() === "true";
}

export function flagsFromEnv(base: Flags = defaultFlags): Flags {
  return {
    offersEnabled: envFlag("FLAG_OFFERS") ?? base.offersEnabled,
    buyNowEnabled: envFlag("FLAG_BUY_NOW") ?? base.buyNowEnabled,
    requireListingReview: envFlag("FLAG_LISTING_REVIEW") ?? base.requireListingReview,
    commentsOnListings: envFlag("FLAG_LISTING_COMMENTS") ?? base.commentsOnListings,
    showPriceRangeOnModel: envFlag("FLAG_PRICE_RANGE") ?? base.showPriceRangeOnModel,
    buyerConfirmsReceipt: envFlag("FLAG_BUYER_CONFIRMS") ?? base.buyerConfirmsReceipt,
    showDesignSwitcher: envFlag("FLAG_DESIGN_SWITCHER") ?? base.showDesignSwitcher,
  };
}

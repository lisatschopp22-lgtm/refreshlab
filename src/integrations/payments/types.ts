import type { orders } from "@/db/schema/transactions";

export type Order = typeof orders.$inferSelect;
export type PaymentMethod = "card" | "bank_transfer" | "invoice";

export type CheckoutSession = {
  /** Where to send the buyer to pay. */
  url: string;
  providerRef: string;
};

export type WebhookResult = {
  handled: boolean;
  orderId?: string;
  event?: string;
};

/**
 * The money seam. `fake` is the default so the prototype runs with no keys and
 * no network; `stripe` exercises the real Connect flow in test mode. Nothing
 * outside this folder knows which one is in use.
 */
export interface PaymentProvider {
  readonly name: string;
  createCheckout(order: Order, method: PaymentMethod, locale: string): Promise<CheckoutSession>;
  handleWebhook(payload: string, signature: string | null): Promise<WebhookResult>;
  refund(order: Order, amountCents: number): Promise<void>;
  onboardSeller(sellerId: string, locale: string): Promise<{ url: string } | null>;
  /** Releases the money that was held until the buyer confirmed receipt. */
  releasePayout(order: Order): Promise<void>;
}

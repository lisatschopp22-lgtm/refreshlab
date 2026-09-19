import { db } from "@/db/client";
import { paymentEvents } from "@/db/schema/transactions";
import type { CheckoutSession, Order, PaymentMethod, PaymentProvider, WebhookResult } from "./types";

/**
 * Simulated money. The buyer lands on a local checkout page with a "pay" and a
 * "fail" button, and a bank transfer waits for an admin to confirm receipt.
 * Every step writes a payment event, exactly as the real provider would, so the
 * order timeline is identical either way.
 */
export class FakePaymentProvider implements PaymentProvider {
  readonly name = "fake";

  async createCheckout(order: Order, method: PaymentMethod, locale: string): Promise<CheckoutSession> {
    const providerRef = `fake_${order.reference}_${Date.now().toString(36)}`;
    await this.record(order.id, "checkout.created", { method, providerRef }, `${providerRef}-created`);
    return { url: `/${locale}/kaufen/${order.id}/zahlung?ref=${providerRef}`, providerRef };
  }

  async handleWebhook(): Promise<WebhookResult> {
    // The fake provider has no external callbacks; the checkout page acts directly.
    return { handled: false };
  }

  async refund(order: Order, amountCents: number) {
    await this.record(
      order.id,
      "refund.succeeded",
      { amountCents },
      `${order.id}-refund-${Date.now().toString(36)}`,
    );
  }

  async onboardSeller() {
    // No onboarding to do: the fake provider pays out to nowhere.
    return null;
  }

  async releasePayout(order: Order) {
    await this.record(
      order.id,
      "payout.released",
      { amountCents: order.amountCents - order.feeCents },
      `${order.id}-payout`,
    );
  }

  private async record(
    orderId: string,
    type: string,
    payload: Record<string, unknown>,
    idempotencyKey: string,
  ) {
    await db
      .insert(paymentEvents)
      .values({ orderId, provider: this.name, type, payload, idempotencyKey })
      .onConflictDoNothing();
  }
}

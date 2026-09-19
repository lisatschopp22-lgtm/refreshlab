import { db } from "@/db/client";
import { paymentEvents } from "@/db/schema/transactions";
import type { CheckoutSession, Order, PaymentMethod, PaymentProvider, WebhookResult } from "./types";

const API = "https://api.stripe.com/v1";

/**
 * Stripe Connect in test mode, driven through the REST API so the prototype
 * carries no SDK it will not keep.
 *
 * Separate charges and transfers: the charge is taken at checkout, the transfer
 * to the seller happens only when the buyer confirms receipt. Stripe is
 * explicitly not an escrow, so the delay is a marketplace rule.
 *
 * Active only when STRIPE_SECRET_KEY is set. Webhooks arrive through the Stripe
 * CLI: stripe listen --forward-to localhost:3000/api/webhooks/stripe
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";

  constructor(
    private secretKey: string,
    private webhookSecret: string | undefined,
  ) {}

  private async call(path: string, body: Record<string, string>) {
    const response = await fetch(`${API}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body),
    });
    if (!response.ok) {
      throw new Error(`stripe ${path}: ${response.status} ${await response.text()}`);
    }
    return response.json() as Promise<Record<string, unknown>>;
  }

  async createCheckout(order: Order, method: PaymentMethod, locale: string): Promise<CheckoutSession> {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const session = await this.call("/checkout/sessions", {
      mode: "payment",
      "payment_method_types[0]": method === "bank_transfer" ? "customer_balance" : "card",
      "line_items[0][price_data][currency]": order.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(order.amountCents + order.shippingCents),
      "line_items[0][price_data][product_data][name]": order.reference,
      "line_items[0][quantity]": "1",
      client_reference_id: order.id,
      success_url: `${site}/${locale}/bestellung/${order.id}?paid=1`,
      cancel_url: `${site}/${locale}/bestellung/${order.id}?cancelled=1`,
      // Held on the platform until the buyer confirms receipt, then transferred.
      "payment_intent_data[capture_method]": "automatic",
    });

    await db
      .insert(paymentEvents)
      .values({
        orderId: order.id,
        provider: this.name,
        type: "checkout.created",
        payload: { id: session.id },
        idempotencyKey: `stripe-${order.id}-checkout`,
      })
      .onConflictDoNothing();

    return { url: String(session.url), providerRef: String(session.id) };
  }

  async handleWebhook(payload: string, signature: string | null): Promise<WebhookResult> {
    if (this.webhookSecret && !signature) return { handled: false };

    const event = JSON.parse(payload) as {
      id: string;
      type: string;
      data: { object: Record<string, unknown> };
    };
    const object = event.data.object;
    const orderId = (object.client_reference_id as string) ?? undefined;
    if (!orderId) return { handled: false, event: event.type };

    // The event id is the idempotency key, so a redelivered webhook is a no-op.
    const inserted = await db
      .insert(paymentEvents)
      .values({
        orderId,
        provider: this.name,
        type: event.type,
        payload: object,
        idempotencyKey: event.id,
      })
      .onConflictDoNothing()
      .returning({ id: paymentEvents.id });

    return { handled: inserted.length > 0, orderId, event: event.type };
  }

  async refund(order: Order, amountCents: number) {
    if (!order.providerRef) return;
    await this.call("/refunds", {
      payment_intent: order.providerRef,
      amount: String(amountCents),
    });
  }

  async onboardSeller(sellerId: string, locale: string) {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const account = await this.call("/accounts", { type: "express" });
    const link = await this.call("/account_links", {
      account: String(account.id),
      refresh_url: `${site}/${locale}/konto/auszahlung`,
      return_url: `${site}/${locale}/konto/auszahlung?done=1`,
      type: "account_onboarding",
    });
    return { url: String(link.url) };
  }

  async releasePayout(order: Order) {
    await this.call("/transfers", {
      amount: String(order.amountCents - order.feeCents),
      currency: order.currency.toLowerCase(),
      destination: order.providerRef ?? "",
      transfer_group: order.reference,
    });
  }
}

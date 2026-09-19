import { FakePaymentProvider } from "./fake";
import { StripePaymentProvider } from "./stripe";
import type { PaymentProvider } from "./types";

export * from "./types";

/**
 * PAYMENT_PROVIDER=fake (default) keeps the prototype runnable with no keys.
 * Setting it to `stripe` with a test-mode key exercises the real Connect flow.
 */
export function paymentProvider(): PaymentProvider {
  const wanted = process.env.PAYMENT_PROVIDER ?? "fake";
  const secret = process.env.STRIPE_SECRET_KEY;

  if (wanted === "stripe" && secret) {
    return new StripePaymentProvider(secret, process.env.STRIPE_WEBHOOK_SECRET);
  }
  return new FakePaymentProvider();
}

export function paymentProviderName() {
  return paymentProvider().name;
}

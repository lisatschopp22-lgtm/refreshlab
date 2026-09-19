"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { orders, paymentEvents } from "@/db/schema/transactions";
import { requireUser } from "@/auth/session";
import { makeOffer, noteOfferInConversation, OfferError, respondToOffer } from "@/domain/offers";
import { createOrder, moveOrder, OrderError } from "@/domain/orders";
import { parseAmountToCents } from "@/domain/money";
import { formatMoney } from "@/i18n/format";
import { paymentProvider } from "@/integrations/payments";
import type { Locale } from "@/i18n/routing";

export type TxState = { error?: string; ok?: boolean };

export async function makeOfferAction(_prev: TxState, formData: FormData): Promise<TxState> {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);
  const listingId = String(formData.get("listingId") ?? "");
  const amountCents = parseAmountToCents(String(formData.get("amount") ?? ""));
  if (amountCents === null) return { error: "invalid_amount" };

  let offerId: string;
  try {
    const offer = await makeOffer(user, {
      listingId,
      amountCents,
      message: String(formData.get("message") ?? ""),
    });
    offerId = offer.id;
  } catch (error) {
    if (error instanceof OfferError) return { error: error.message };
    throw error;
  }

  // The negotiation stays visible in the thread, as in mockup S9.
  await noteOfferInConversation(
    user,
    offerId,
    `${formatMoney(amountCents, "CHF", locale as Locale)} — ${String(formData.get("message") ?? "").trim() || "Preisangebot"}`,
  );

  revalidatePath(`/${locale}/konto/angebote`);
  redirect(`/${locale}/konto/angebote?sent=1`);
}

export async function respondOfferAction(_prev: TxState, formData: FormData): Promise<TxState> {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);
  const offerId = String(formData.get("offerId") ?? "");
  const intent = String(formData.get("intent") ?? "");

  const parsed = z.enum(["accepted", "rejected", "countered", "withdrawn"]).safeParse(intent);
  if (!parsed.success) return { error: "invalid" };

  const counter =
    parsed.data === "countered"
      ? parseAmountToCents(String(formData.get("counterAmount") ?? ""))
      : undefined;
  if (parsed.data === "countered" && counter === null) return { error: "invalid_amount" };

  try {
    await respondToOffer(user, offerId, parsed.data, counter ?? undefined);
  } catch (error) {
    if (error instanceof OfferError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/${locale}/konto/angebote`);
  return { ok: true };
}

/** An accepted offer becomes a transaction the buyer can pay. */
export async function checkoutFromOfferAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);
  const offerId = String(formData.get("offerId") ?? "");
  const listingId = String(formData.get("listingId") ?? "");

  const order = await createOrder(user, { listingId, offerId });
  redirect(`/${locale}/kaufen/${order.id}`);
}

export async function buyNowAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);
  const listingId = String(formData.get("listingId") ?? "");

  try {
    const order = await createOrder(user, { listingId });
    redirect(`/${locale}/kaufen/${order.id}`);
  } catch (error) {
    if (error instanceof OrderError) redirect(`/${locale}/geraete?error=${error.message}`);
    throw error;
  }
}

export async function startPaymentAction(_prev: TxState, formData: FormData): Promise<TxState> {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);
  const orderId = String(formData.get("orderId") ?? "");
  const method = String(formData.get("method") ?? "card") as "card" | "bank_transfer" | "invoice";

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.buyerId !== user.id) return { error: "not_your_order" };

  const session = await paymentProvider().createCheckout(order, method, locale);
  await db
    .update(orders)
    .set({ paymentMethod: method, providerRef: session.providerRef })
    .where(eq(orders.id, orderId));

  redirect(session.url);
}

/** The fake provider's checkout page calls this instead of a webhook. */
export async function simulatePaymentAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);
  const orderId = String(formData.get("orderId") ?? "");
  const outcome = String(formData.get("outcome") ?? "success");

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.buyerId !== user.id) redirect(`/${locale}/konto/transaktionen`);

  await db
    .insert(paymentEvents)
    .values({
      orderId,
      provider: "fake",
      type: outcome === "success" ? "payment.succeeded" : "payment.failed",
      payload: { amountCents: order!.amountCents, simulated: true },
      idempotencyKey: `fake-${orderId}-${outcome}-${Date.now().toString(36)}`,
    })
    .onConflictDoNothing();

  if (outcome === "success") {
    await moveOrder(user, orderId, "paid");
  }

  revalidatePath(`/${locale}/bestellung/${orderId}`);
  redirect(`/${locale}/bestellung/${orderId}`);
}

export async function moveOrderAction(_prev: TxState, formData: FormData): Promise<TxState> {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);
  const orderId = String(formData.get("orderId") ?? "");
  const to = String(formData.get("to") ?? "");

  const parsed = z
    .enum(["paid", "shipped", "delivered", "completed", "cancelled", "disputed", "refunded"])
    .safeParse(to);
  if (!parsed.success) return { error: "invalid" };

  try {
    const order = await moveOrder(user, orderId, parsed.data, {
      trackingReference: String(formData.get("trackingReference") ?? "") || undefined,
      reason: String(formData.get("reason") ?? "") || undefined,
      note: String(formData.get("note") ?? "") || undefined,
    });

    // Releasing the payout is a provider call, not just a status change.
    if (parsed.data === "completed") {
      await paymentProvider().releasePayout(order);
    }
    if (parsed.data === "refunded") {
      await paymentProvider().refund(order, order.refundedCents || order.amountCents);
    }
  } catch (error) {
    if (error instanceof OrderError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/${locale}/bestellung/${orderId}`);
  revalidatePath(`/${locale}/konto/transaktionen`);
  return { ok: true };
}

/** Bank transfer: an admin confirms the money arrived. */
export async function confirmTransferAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);
  const orderId = String(formData.get("orderId") ?? "");

  await db
    .insert(paymentEvents)
    .values({
      orderId,
      provider: "fake",
      type: "transfer.received",
      payload: { confirmedBy: user.id },
      idempotencyKey: `transfer-${orderId}`,
    })
    .onConflictDoNothing();

  await moveOrder(user, orderId, "paid");
  revalidatePath(`/${locale}/bestellung/${orderId}`);
}

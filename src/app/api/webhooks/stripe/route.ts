import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema/transactions";
import { paymentProvider } from "@/integrations/payments";
import { moveOrder } from "@/domain/orders";

export const dynamic = "force-dynamic";

/**
 * Stripe CLI: stripe listen --forward-to localhost:3000/api/webhooks/stripe
 * Idempotency lives in payment_events.idempotency_key, so a redelivery is a
 * no-op rather than a second state change.
 */
export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  const result = await paymentProvider().handleWebhook(payload, signature);
  if (!result.handled || !result.orderId) {
    return NextResponse.json({ received: true, handled: false });
  }

  if (result.event === "checkout.session.completed") {
    const [order] = await db.select().from(orders).where(eq(orders.id, result.orderId)).limit(1);
    if (order && order.status === "pending_payment") {
      // A webhook acts as the system, not as a signed-in person.
      await moveOrder(
        {
          id: order.buyerId,
          email: "",
          displayName: "system",
          role: "admin",
          locale: "de",
          avatarPath: null,
          suspendedAt: null,
          verifiedAt: null,
          organisations: [],
        },
        order.id,
        "paid",
      );
    }
  }

  return NextResponse.json({ received: true, handled: true });
}

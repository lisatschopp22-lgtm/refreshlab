import { and, asc, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { messages } from "@/db/schema/community";
import { profiles } from "@/db/schema/identity";
import { listings } from "@/db/schema/marketplace";
import { outbox } from "@/db/schema/operations";
import { orders, ratings } from "@/db/schema/transactions";
import { searchProvider } from "@/integrations/search";
import { layout, mailer } from "@/integrations/email";
import { flags } from "./settings";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const MAX_ATTEMPTS = 3;

type Handler = (payload: Record<string, unknown>) => Promise<void>;

const handlers: Record<string, Handler> = {
  /** Keeps the search haystack in step with catalogue changes. */
  "listing.reindex": async (payload) => {
    const listingId = payload.listingId as string | undefined;
    await searchProvider().reindex(listingId ? [listingId] : undefined);
  },

  "listing.published": async (payload) => {
    const listingId = payload.listingId as string;
    const [row] = await db
      .select({ title: listings.title, slug: listings.slug, email: profiles.email })
      .from(listings)
      .innerJoin(profiles, eq(profiles.id, listings.sellerProfileId))
      .where(eq(listings.id, listingId))
      .limit(1);
    if (!row) return;
    const url = `${siteUrl}/de/geraete/${row.slug}`;
    await mailer().send({
      to: row.email,
      subject: `Ihr Inserat ist online: ${row.title}`,
      ...layout(
        "Ihr Inserat ist online",
        `${row.title} ist jetzt öffentlich sichtbar. Geben Sie diesem Gerät eine zweite Umdrehung.`,
        url,
        "Inserat ansehen",
      ),
    });
  },

  "message.sent": async (payload) => {
    const messageId = payload.messageId as string;
    const [row] = await db
      .select({
        body: messages.body,
        conversationId: messages.conversationId,
        senderName: profiles.displayName,
      })
      .from(messages)
      .innerJoin(profiles, eq(profiles.id, messages.senderId))
      .where(eq(messages.id, messageId))
      .limit(1);
    if (!row) return;

    const recipients = await db.execute<{ email: string }>(sql`
      select p.email from conversation_participants cp
      join profiles p on p.id = cp.profile_id
      where cp.conversation_id = ${row.conversationId}
        and cp.profile_id <> (select sender_id from messages where id = ${messageId})
    `);

    for (const recipient of recipients as unknown as { email: string }[]) {
      await mailer().send({
        to: recipient.email,
        subject: `Neue Nachricht von ${row.senderName}`,
        ...layout(
          `Neue Nachricht von ${row.senderName}`,
          row.body.slice(0, 400),
          `${siteUrl}/de/nachrichten/${row.conversationId}`,
          "Antworten",
        ),
      });
    }
  },

  "offer.received": async (payload) => {
    const [row] = await db
      .select({ email: profiles.email, title: listings.title, slug: listings.slug })
      .from(listings)
      .innerJoin(profiles, eq(profiles.id, listings.sellerProfileId))
      .where(eq(listings.id, payload.listingId as string))
      .limit(1);
    if (!row) return;
    await mailer().send({
      to: row.email,
      subject: `Neues Angebot für ${row.title}`,
      ...layout(
        "Sie haben ein Angebot erhalten",
        `Für ${row.title} liegt ein neues Preisangebot vor.`,
        `${siteUrl}/de/konto/angebote`,
        "Angebot ansehen",
      ),
    });
  },

  "order.updated": async (payload) => {
    const orderId = payload.orderId as string;
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return;
    const people = await db
      .select({ id: profiles.id, email: profiles.email })
      .from(profiles)
      .where(sql`${profiles.id} in (${order.buyerId}, ${order.sellerId})`);
    // A completed deal opens the rating period for both sides.
    const text =
      order.status === "completed"
        ? `Der Status hat sich geändert: ${order.status}. Bitte bewerten Sie jetzt die andere Seite.`
        : `Der Status hat sich geändert: ${order.status}.`;
    for (const person of people) {
      await mailer().send({
        to: person.email,
        subject: `Transaktion ${order.reference}: ${order.status}`,
        ...layout(
          `Transaktion ${order.reference}`,
          text,
          `${siteUrl}/de/bestellung/${order.id}`,
          "Transaktion ansehen",
        ),
      });
    }
  },

  "rating.created": async (payload) => {
    const [row] = await db
      .select({ orderId: ratings.orderId, reference: orders.reference, email: profiles.email })
      .from(ratings)
      .innerJoin(orders, eq(orders.id, ratings.orderId))
      .innerJoin(profiles, eq(profiles.id, ratings.rateeProfileId))
      .where(eq(ratings.id, payload.ratingId as string))
      .limit(1);
    if (!row) return;
    const { ratingsRevealTogether } = await flags();
    await mailer().send({
      to: row.email,
      subject: `Neue Bewertung zu ${row.reference}`,
      ...layout(
        "Sie haben eine Bewertung erhalten",
        ratingsRevealTogether
          ? `Zur Transaktion ${row.reference} liegt eine Bewertung vor. Sie sehen sie, sobald Sie ebenfalls bewertet haben oder die Frist abgelaufen ist.`
          : `Zur Transaktion ${row.reference} liegt eine Bewertung vor.`,
        `${siteUrl}/de/bestellung/${row.orderId}`,
        "Transaktion ansehen",
      ),
    });
  },
};

/**
 * Drains the outbox. Called by /api/jobs/run, which a dev-only interval hits.
 * In production this would be the separate worker from the architecture.
 */
export async function runOutbox(limit = 50) {
  const pending = await db
    .select()
    .from(outbox)
    .where(and(isNull(outbox.processedAt), lt(sql`(attempts ->> 'count')::int`, MAX_ATTEMPTS)))
    .orderBy(asc(outbox.createdAt))
    .limit(limit);

  let done = 0;
  let failed = 0;

  for (const entry of pending) {
    const handler = handlers[entry.topic];
    if (!handler) {
      await db.update(outbox).set({ processedAt: new Date() }).where(eq(outbox.id, entry.id));
      continue;
    }
    try {
      await handler(entry.payload);
      await db.update(outbox).set({ processedAt: new Date() }).where(eq(outbox.id, entry.id));
      done += 1;
    } catch (error) {
      failed += 1;
      await db
        .update(outbox)
        .set({
          attempts: {
            count: (entry.attempts?.count ?? 0) + 1,
            lastError: error instanceof Error ? error.message : String(error),
          },
        })
        .where(eq(outbox.id, entry.id));
    }
  }

  return { processed: done, failed, pending: pending.length };
}

/** Entries that exhausted their retries: the dead-letter view for the admin area. */
export async function deadLetters() {
  return db
    .select()
    .from(outbox)
    .where(and(isNull(outbox.processedAt), sql`(attempts ->> 'count')::int >= ${MAX_ATTEMPTS}`))
    .orderBy(asc(outbox.createdAt));
}

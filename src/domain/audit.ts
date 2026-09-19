import { db } from "@/db/client";
import { auditLog, outbox } from "@/db/schema/operations";

/** Every administrative mutation records what changed, before and after. */
export async function recordAudit(entry: {
  actorId: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  await db.insert(auditLog).values({
    actorId: entry.actorId,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId ?? null,
    summary: entry.summary ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
  });
}

/** Work that must happen after a write but not inside the request. */
export async function enqueue(topic: string, payload: Record<string, unknown>) {
  await db.insert(outbox).values({ topic, payload });
}

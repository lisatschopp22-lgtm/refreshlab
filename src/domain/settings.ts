import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { settings } from "@/db/schema/operations";
import type { SessionUser } from "@/auth/session";
import { assert, isAdmin } from "./permissions";
import { defaultFeeRule, normaliseFeeRule, type FeeRule } from "./fees";
import { defaultFlags, flagsFromEnv, type Flags } from "./flags";
import { recordAudit } from "./audit";

async function readSetting<T>(key: string, fallback: T): Promise<T> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return (row?.value as T) ?? fallback;
}

export async function feeRule(): Promise<FeeRule> {
  return normaliseFeeRule(await readSetting<unknown>("fee_rule", defaultFeeRule));
}

/** Admin settings sit under the env overrides, which always win. */
export async function flags(): Promise<Flags> {
  // A flag added after the settings were saved takes its default.
  const stored = await readSetting<Partial<Flags>>("flags", defaultFlags);
  return flagsFromEnv({ ...defaultFlags, ...stored });
}

export async function writeSetting(user: SessionUser, key: string, value: unknown) {
  assert(isAdmin(user), "Admin only");
  const [before] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

  await db
    .insert(settings)
    .values({ key, value, updatedBy: user.id })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedBy: user.id, updatedAt: new Date() } });

  await recordAudit({
    actorId: user.id,
    action: "settings.updated",
    targetType: "settings",
    summary: key,
    before: (before?.value as Record<string, unknown>) ?? null,
    after: value as Record<string, unknown>,
  });
}

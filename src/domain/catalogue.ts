import { eq, like, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, equipmentModels, manufacturers } from "@/db/schema/catalogue";
import type { SessionUser } from "@/auth/session";
import { assert, canPublishListing } from "./permissions";
import { recordAudit } from "./audit";
import { createDraft } from "./listings";
import { slugify, uniqueSlug } from "./slug";

export type ModelProposal = {
  categoryId: string;
  name: string;
  organisationId?: string | null;
  /** An existing manufacturer, or the name of one the catalogue does not have yet. */
  manufacturer: { id: string } | { name: string; website?: string | null };
};

/**
 * A seller's instrument that the catalogue does not know. The model, and a
 * manufacturer if it is new, stay pending until an administrator has checked
 * that they exist; the listing waits for that check before it goes public.
 */
export async function proposeModel(user: SessionUser, proposal: ModelProposal) {
  assert(canPublishListing(user, proposal.organisationId), "Not allowed to create listings");

  const [category] = await db.select().from(categories).where(eq(categories.id, proposal.categoryId)).limit(1);
  // Consumables have no models, so a proposal can only name an equipment category.
  assert(category?.kind === "equipment", "Unknown equipment category");

  const manufacturerId =
    "id" in proposal.manufacturer
      ? proposal.manufacturer.id
      : await proposeManufacturer(user, proposal.manufacturer.name, proposal.manufacturer.website ?? null);

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(equipmentModels);
  const [model] = await db
    .insert(equipmentModels)
    .values({
      recordNumber: `RL-EQ-${String(4000 + Number(count)).padStart(6, "0")}-P`,
      manufacturerId,
      categoryId: proposal.categoryId,
      name: proposal.name,
      slug: `${slugify(proposal.name)}-${Date.now().toString(36)}`,
      status: "pending",
      proposedBy: user.id,
    })
    .returning();

  await recordAudit({
    actorId: user.id,
    action: "model.proposed",
    targetType: "equipment_model",
    targetId: model!.id,
    summary: proposal.name,
  });

  return createDraft(user, { modelId: model!.id, organisationId: proposal.organisationId ?? null });
}

/**
 * The same company typed twice must not become two manufacturers, so a name
 * the catalogue already has, published or still pending, is reused.
 */
async function proposeManufacturer(user: SessionUser, name: string, website: string | null) {
  const trimmed = name.trim();
  const [existing] = await db
    .select({ id: manufacturers.id })
    .from(manufacturers)
    .where(sql`lower(${manufacturers.name}) = lower(${trimmed}) and ${manufacturers.status} <> 'merged'`)
    .limit(1);
  if (existing) return existing.id;

  const root = slugify(trimmed) || "hersteller";
  const taken = await db.select({ slug: manufacturers.slug }).from(manufacturers).where(like(manufacturers.slug, `${root}%`));
  const [row] = await db
    .insert(manufacturers)
    .values({
      name: trimmed,
      slug: uniqueSlug(root, new Set(taken.map((r) => r.slug))),
      website,
      status: "pending",
      proposedBy: user.id,
    })
    .returning();

  await recordAudit({
    actorId: user.id,
    action: "manufacturer.proposed",
    targetType: "manufacturer",
    targetId: row!.id,
    summary: trimmed,
  });
  return row!.id;
}

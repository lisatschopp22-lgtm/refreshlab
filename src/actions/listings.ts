"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { getCategoryById } from "@/db/queries/catalogue";
import { equipmentModels, manufacturers } from "@/db/schema/catalogue";
import { listingAttachments, listingImages, listings, watchlist } from "@/db/schema/marketplace";
import { requireUser } from "@/auth/session";
import {
  createDraft,
  getEditableListing,
  publishListing,
  setListingStatus,
  softDeleteListing,
  updateListing,
} from "@/domain/listings";
import { parseAmountToCents } from "@/domain/money";
import { slugify } from "@/domain/slug";
import { uploadAttachment, uploadImage, UploadError } from "@/integrations/storage";
import { recordAudit } from "@/domain/audit";

export type FormState = { error?: string; ok?: boolean; fields?: string[] };

/** Typeahead for the "identify the instrument" step of the sell wizard. */
export async function searchModels(term: string) {
  const query = term.trim();
  if (query.length < 2) return [];
  return db
    .select({
      id: equipmentModels.id,
      name: equipmentModels.name,
      slug: equipmentModels.slug,
      recordNumber: equipmentModels.recordNumber,
      imagePath: equipmentModels.imagePath,
      manufacturerName: manufacturers.name,
    })
    .from(equipmentModels)
    .innerJoin(manufacturers, eq(manufacturers.id, equipmentModels.manufacturerId))
    .where(
      and(
        eq(equipmentModels.status, "published"),
        or(
          ilike(equipmentModels.name, `%${query}%`),
          ilike(manufacturers.name, `%${query}%`),
          sql`rl_unaccent(${query}) <% rl_unaccent(${manufacturers.name} || ' ' || ${equipmentModels.name})`,
        ),
      ),
    )
    .orderBy(asc(manufacturers.name), asc(equipmentModels.name))
    .limit(12);
}

export async function startListingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);
  const modelId = String(formData.get("modelId") ?? "");
  const organisationId = String(formData.get("organisationId") ?? "") || null;
  if (!modelId) return { error: "model" };

  const draft = await createDraft(user, { modelId, organisationId });
  redirect(`/${locale}/verkaufen/${draft.id}/zustand`);
}

/** A model the catalogue does not have yet. It is reviewed before it goes public. */
export async function proposeModelAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);

  const parsed = z
    .object({
      manufacturerId: z.uuid(),
      categoryId: z.uuid(),
      name: z.string().min(2).max(120),
      organisationId: z.string().optional(),
    })
    .safeParse({
      manufacturerId: formData.get("manufacturerId"),
      categoryId: formData.get("categoryId"),
      name: formData.get("name"),
      organisationId: formData.get("organisationId") || undefined,
    });
  if (!parsed.success) return { error: "invalid" };
  // Consumables have no models, so a proposal can only name an equipment category.
  const category = await getCategoryById(parsed.data.categoryId);
  if (category?.kind !== "equipment") return { error: "invalid" };

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(equipmentModels);

  const [model] = await db
    .insert(equipmentModels)
    .values({
      recordNumber: `RL-EQ-${String(4000 + Number(count)).padStart(6, "0")}-P`,
      manufacturerId: parsed.data.manufacturerId,
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      slug: `${slugify(parsed.data.name)}-${Date.now().toString(36)}`,
      status: "pending",
      proposedBy: user.id,
    })
    .returning();

  await recordAudit({
    actorId: user.id,
    action: "model.proposed",
    targetType: "equipment_model",
    targetId: model!.id,
    summary: parsed.data.name,
  });

  const draft = await createDraft(user, {
    modelId: model!.id,
    organisationId: parsed.data.organisationId ?? null,
  });
  redirect(`/${locale}/verkaufen/${draft.id}/zustand`);
}

const conditionValues = ["new", "like_new", "good", "fair", "for_parts"] as const;

export async function saveConditionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = String(formData.get("locale") ?? "de");
  const listingId = String(formData.get("listingId") ?? "");
  const user = await requireUser(locale);

  const parsed = z
    .object({
      title: z.string().min(3).max(160),
      condition: z.enum(conditionValues),
      conditionNotes: z.string().min(10).max(4000),
      scopeOfDelivery: z.string().max(2000).optional(),
      description: z.string().max(4000).optional(),
      year: z.coerce.number().int().min(1950).max(2030).optional(),
      operatingHours: z.coerce.number().int().min(0).max(500_000).optional(),
    })
    .safeParse({
      title: formData.get("title"),
      condition: formData.get("condition"),
      conditionNotes: formData.get("conditionNotes"),
      scopeOfDelivery: formData.get("scopeOfDelivery") || undefined,
      description: formData.get("description") || undefined,
      year: formData.get("year") || undefined,
      operatingHours: formData.get("operatingHours") || undefined,
    });

  if (!parsed.success) {
    return { error: "invalid", fields: parsed.error.issues.map((i) => String(i.path[0])) };
  }

  await updateListing(user, listingId, {
    title: parsed.data.title,
    condition: parsed.data.condition,
    conditionNotes: parsed.data.conditionNotes,
    scopeOfDelivery: parsed.data.scopeOfDelivery ?? "",
    description: parsed.data.description ?? "",
    year: parsed.data.year ?? null,
    operatingHours: parsed.data.operatingHours ?? null,
  });

  if (formData.get("intent") === "draft") {
    revalidatePath(`/${locale}/konto/inserate`);
    return { ok: true };
  }
  redirect(`/${locale}/verkaufen/${listingId}/preis`);
}

export async function savePriceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = String(formData.get("locale") ?? "de");
  const listingId = String(formData.get("listingId") ?? "");
  const user = await requireUser(locale);

  const priceCents = parseAmountToCents(String(formData.get("price") ?? ""));
  if (priceCents === null || priceCents <= 0) return { error: "invalid", fields: ["price"] };
  const minRaw = String(formData.get("minPrice") ?? "").trim();
  const minPriceCents = minRaw ? parseAmountToCents(minRaw) : null;

  const parsed = z
    .object({
      currency: z.enum(["CHF", "EUR"]),
      negotiable: z.enum(["fixed", "offer", "both"]),
      locationCity: z.string().min(2).max(80),
      locationCountry: z.string().length(2),
      warrantyMonths: z.coerce.number().int().min(0).max(60),
    })
    .safeParse({
      currency: formData.get("currency"),
      negotiable: formData.get("negotiable"),
      locationCity: formData.get("locationCity"),
      locationCountry: formData.get("locationCountry"),
      warrantyMonths: formData.get("warrantyMonths") || 0,
    });
  if (!parsed.success) {
    return { error: "invalid", fields: parsed.error.issues.map((i) => String(i.path[0])) };
  }

  await updateListing(user, listingId, {
    priceCents,
    minPriceCents,
    currency: parsed.data.currency,
    negotiable: parsed.data.negotiable,
    locationCity: parsed.data.locationCity,
    locationCountry: parsed.data.locationCountry.toUpperCase(),
    warrantyMonths: parsed.data.warrantyMonths,
  });

  if (formData.get("intent") === "draft") return { ok: true };
  redirect(`/${locale}/verkaufen/${listingId}/pruefen`);
}

export async function uploadListingImageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = String(formData.get("locale") ?? "de");
  const listingId = String(formData.get("listingId") ?? "");
  const user = await requireUser(locale);
  const listing = await getEditableListing(user, listingId);

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "empty" };

  const [{ nextOrder }] = await db
    .select({ nextOrder: sql<number>`coalesce(max(sort_order), -1) + 1` })
    .from(listingImages)
    .where(eq(listingImages.listingId, listingId));

  try {
    let order = Number(nextOrder);
    for (const file of files) {
      const path = await uploadImage(file, `listings/${listingId}`);
      await db.insert(listingImages).values({
        listingId,
        storagePath: path,
        alt: `${listing.title} (${order + 1})`,
        sortOrder: order,
      });
      order += 1;
    }
  } catch (error) {
    return { error: error instanceof UploadError ? error.message : "upload" };
  }

  revalidatePath(`/${locale}/verkaufen/${listingId}/zustand`);
  return { ok: true };
}

export async function uploadAttachmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = String(formData.get("locale") ?? "de");
  const listingId = String(formData.get("listingId") ?? "");
  const user = await requireUser(locale);
  await getEditableListing(user, listingId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "empty" };
  const kind = String(formData.get("kind") ?? "other");

  try {
    const path = await uploadAttachment(file, `listings/${listingId}`);
    await db.insert(listingAttachments).values({
      listingId,
      storagePath: path,
      filename: file.name.slice(0, 160),
      kind: kind as typeof listingAttachments.$inferInsert.kind,
    });
  } catch (error) {
    return { error: error instanceof UploadError ? error.message : "upload" };
  }

  revalidatePath(`/${locale}/verkaufen/${listingId}/zustand`);
  return { ok: true };
}

export async function deleteImageAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "de");
  const imageId = String(formData.get("imageId") ?? "");
  const user = await requireUser(locale);

  const [image] = await db.select().from(listingImages).where(eq(listingImages.id, imageId)).limit(1);
  if (!image) return;
  await getEditableListing(user, image.listingId);
  await db.delete(listingImages).where(eq(listingImages.id, imageId));
  revalidatePath(`/${locale}/verkaufen/${image.listingId}/zustand`);
}

export async function publishListingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = String(formData.get("locale") ?? "de");
  const listingId = String(formData.get("listingId") ?? "");
  const user = await requireUser(locale);

  const result = await publishListing(user, listingId);
  if (!result.ok) return { error: "incomplete", fields: result.problems };

  revalidatePath("/", "layout");
  redirect(
    result.requiresReview
      ? `/${locale}/konto/inserate?status=pending_review`
      : `/${locale}/geraete/${result.listing.slug}`,
  );
}

export async function setStatusAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "de");
  const listingId = String(formData.get("listingId") ?? "");
  const status = String(formData.get("status") ?? "");
  const user = await requireUser(locale);

  if (status === "deleted") await softDeleteListing(user, listingId);
  else await setListingStatus(user, listingId, status as typeof listings.$inferInsert.status);

  revalidatePath(`/${locale}/konto/inserate`);
  revalidatePath("/", "layout");
}

export async function toggleWatchAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "de");
  const listingId = String(formData.get("listingId") ?? "");
  const user = await requireUser(locale);

  const [existing] = await db
    .select()
    .from(watchlist)
    .where(and(eq(watchlist.profileId, user.id), eq(watchlist.listingId, listingId)))
    .limit(1);

  if (existing) await db.delete(watchlist).where(eq(watchlist.id, existing.id));
  else await db.insert(watchlist).values({ profileId: user.id, listingId });

  revalidatePath(`/${locale}/konto/merkliste`);
}

export async function listingImagesFor(listingId: string) {
  return db
    .select()
    .from(listingImages)
    .where(eq(listingImages.listingId, listingId))
    .orderBy(asc(listingImages.sortOrder));
}

export async function listingAttachmentsFor(listingId: string) {
  return db
    .select()
    .from(listingAttachments)
    .where(eq(listingAttachments.listingId, listingId))
    .orderBy(desc(listingAttachments.createdAt));
}

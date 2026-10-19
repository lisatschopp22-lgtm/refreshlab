"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { equipmentModels, manufacturers } from "@/db/schema/catalogue";
import { proposeModel } from "@/domain/catalogue";
import { NEW_MANUFACTURER } from "@/domain/proposal";
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
import { signedAttachmentUrl, uploadAttachment, uploadImage, UploadError } from "@/integrations/storage";

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

/**
 * An instrument the catalogue does not have yet, and its manufacturer if that
 * is missing too. Both are checked before the listing goes public.
 */
export async function proposeModelAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);

  const parsed = z
    .object({
      manufacturerId: z.union([z.uuid(), z.literal(NEW_MANUFACTURER)]),
      manufacturerName: z.string().trim().max(120).optional(),
      manufacturerWebsite: z.url().max(300).optional(),
      categoryId: z.uuid(),
      name: z.string().trim().min(2).max(120),
      organisationId: z.string().optional(),
    })
    .refine((data) => data.manufacturerId !== NEW_MANUFACTURER || (data.manufacturerName ?? "").length >= 2, {
      path: ["manufacturerName"],
    })
    .safeParse({
      manufacturerId: formData.get("manufacturerId"),
      manufacturerName: formData.get("manufacturerName") || undefined,
      manufacturerWebsite: formData.get("manufacturerWebsite") || undefined,
      categoryId: formData.get("categoryId"),
      name: formData.get("name"),
      organisationId: formData.get("organisationId") || undefined,
    });
  if (!parsed.success) {
    return { error: "invalid", fields: parsed.error.issues.map((issue) => String(issue.path[0])) };
  }

  const { manufacturerId, manufacturerName, manufacturerWebsite, ...rest } = parsed.data;
  let draft;
  try {
    draft = await proposeModel(user, {
      ...rest,
      manufacturer:
        manufacturerId === NEW_MANUFACTURER
          ? { name: manufacturerName!, website: manufacturerWebsite ?? null }
          : { id: manufacturerId },
    });
  } catch {
    return { error: "invalid", fields: ["categoryId"] };
  }
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
  // The serial plate is checked by eye, so it has to be a picture.
  if (kind === "serial_plate" && !file.type.startsWith("image/")) return { error: "type" };

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

/** Documents only: the serial plate photo has a slot of its own. */
export async function listingAttachmentsFor(listingId: string) {
  return db
    .select()
    .from(listingAttachments)
    .where(and(eq(listingAttachments.listingId, listingId), ne(listingAttachments.kind, "serial_plate")))
    .orderBy(desc(listingAttachments.createdAt));
}

/** The newest serial plate photo, with a short-lived link for the seller or an administrator. */
export async function serialPhotoFor(listingId: string) {
  const [row] = await db
    .select()
    .from(listingAttachments)
    .where(and(eq(listingAttachments.listingId, listingId), eq(listingAttachments.kind, "serial_plate")))
    .orderBy(desc(listingAttachments.createdAt))
    .limit(1);
  if (!row) return null;
  return { ...row, url: await signedAttachmentUrl(row.storagePath) };
}

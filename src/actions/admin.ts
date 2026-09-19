"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/auth/session";
import {
  approveListing,
  approveModel,
  mergeModels,
  savePage,
  setListingFeatured,
  setListingVerified,
  setOrganisationVerified,
  setUserRole,
  setUserSuspended,
  setUserVerified,
} from "@/domain/admin";
import { setCommentStatus, deleteComment } from "@/domain/comments";
import { resolveReport } from "@/domain/moderation";
import { restoreListing, setListingStatus, softDeleteListing, updateListing } from "@/domain/listings";
import { writeSetting } from "@/domain/settings";
import { defaultFeeRule } from "@/domain/fees";
import { defaultFlags } from "@/domain/flags";
import { runOutbox } from "@/domain/outbox";
import type { listings } from "@/db/schema/marketplace";

export type AdminState = { error?: string; ok?: boolean; message?: string };

const locOf = (formData: FormData) => String(formData.get("locale") ?? "de");

export async function userAction(formData: FormData) {
  const locale = locOf(formData);
  const user = await requireAdmin(locale);
  const profileId = String(formData.get("profileId") ?? "");
  const intent = String(formData.get("intent") ?? "");

  switch (intent) {
    case "suspend":
      await setUserSuspended(user, profileId, true, String(formData.get("reason") ?? "") || undefined);
      break;
    case "unsuspend":
      await setUserSuspended(user, profileId, false);
      break;
    case "verify":
      await setUserVerified(user, profileId, true);
      break;
    case "unverify":
      await setUserVerified(user, profileId, false);
      break;
    case "make_admin":
      await setUserRole(user, profileId, "admin");
      break;
    case "remove_admin":
      await setUserRole(user, profileId, "user");
      break;
  }

  revalidatePath(`/${locale}/admin/nutzende`);
  revalidatePath(`/${locale}/admin/nutzende/${profileId}`);
}

export async function organisationAction(formData: FormData) {
  const locale = locOf(formData);
  const user = await requireAdmin(locale);
  const organisationId = String(formData.get("organisationId") ?? "");
  const intent = String(formData.get("intent") ?? "");

  await setOrganisationVerified(user, organisationId, intent === "verify");
  revalidatePath(`/${locale}/admin/organisationen`);
}

export async function listingAdminAction(formData: FormData) {
  const locale = locOf(formData);
  const user = await requireAdmin(locale);
  const listingId = String(formData.get("listingId") ?? "");
  const intent = String(formData.get("intent") ?? "");

  switch (intent) {
    case "approve":
      await approveListing(user, listingId);
      break;
    case "verify":
      await setListingVerified(user, listingId, true);
      break;
    case "unverify":
      await setListingVerified(user, listingId, false);
      break;
    case "feature":
      await setListingFeatured(user, listingId, 14);
      break;
    case "unfeature":
      await setListingFeatured(user, listingId, 0);
      break;
    case "hide":
      await softDeleteListing(user, listingId);
      break;
    case "restore":
      await restoreListing(user, listingId);
      await setListingStatus(user, listingId, "active");
      break;
    default:
      if (["active", "withdrawn", "sold", "reserved", "pending_review"].includes(intent)) {
        await setListingStatus(user, listingId, intent as typeof listings.$inferInsert.status);
      }
  }

  revalidatePath(`/${locale}/admin/inserate`);
  revalidatePath("/", "layout");
}

/** An administrator may correct any listing; the change lands in the audit log. */
export async function editListingAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const locale = locOf(formData);
  const user = await requireAdmin(locale);
  const listingId = String(formData.get("listingId") ?? "");

  const parsed = z
    .object({ title: z.string().min(3).max(160), conditionNotes: z.string().max(4000) })
    .safeParse({
      title: formData.get("title"),
      conditionNotes: formData.get("conditionNotes"),
    });
  if (!parsed.success) return { error: "invalid" };

  await updateListing(user, listingId, {
    title: parsed.data.title,
    conditionNotes: parsed.data.conditionNotes,
  });
  revalidatePath(`/${locale}/admin/inserate`);
  return { ok: true };
}

export async function commentAdminAction(formData: FormData) {
  const locale = locOf(formData);
  const user = await requireAdmin(locale);
  const commentId = String(formData.get("commentId") ?? "");
  const intent = String(formData.get("intent") ?? "");

  if (intent === "hide") {
    await setCommentStatus(user, commentId, "hidden", String(formData.get("reason") ?? "") || undefined);
  } else if (intent === "show") {
    await setCommentStatus(user, commentId, "visible");
  } else if (intent === "delete") {
    await deleteComment(user, commentId);
  }

  revalidatePath(`/${locale}/admin/kommentare`);
}

export async function modelAdminAction(formData: FormData) {
  const locale = locOf(formData);
  const user = await requireAdmin(locale);
  const intent = String(formData.get("intent") ?? "");

  if (intent === "approve") {
    await approveModel(user, String(formData.get("modelId") ?? ""));
  } else if (intent === "merge") {
    await mergeModels(user, String(formData.get("sourceId") ?? ""), String(formData.get("targetId") ?? ""));
  }

  revalidatePath(`/${locale}/admin/geraetedaten`);
}

export async function reportAction(formData: FormData) {
  const locale = locOf(formData);
  const user = await requireAdmin(locale);
  const reportId = String(formData.get("reportId") ?? "");
  const intent = String(formData.get("intent") ?? "resolve");

  await resolveReport(
    user,
    reportId,
    intent === "dismiss" ? "dismissed" : "resolved",
    String(formData.get("note") ?? "") || undefined,
  );
  revalidatePath(`/${locale}/admin`);
  revalidatePath(`/${locale}/admin/meldungen`);
}

export async function savePageAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const locale = locOf(formData);
  const user = await requireAdmin(locale);

  const parsed = z
    .object({
      slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
      titleDe: z.string().min(2),
      titleEn: z.string().min(2),
      bodyDe: z.string().min(2),
      bodyEn: z.string().min(2),
    })
    .safeParse({
      slug: formData.get("slug"),
      titleDe: formData.get("titleDe"),
      titleEn: formData.get("titleEn"),
      bodyDe: formData.get("bodyDe"),
      bodyEn: formData.get("bodyEn"),
    });
  if (!parsed.success) return { error: "invalid" };

  await savePage(user, {
    slug: parsed.data.slug,
    title: { de: parsed.data.titleDe, en: parsed.data.titleEn },
    body: { de: parsed.data.bodyDe, en: parsed.data.bodyEn },
    published: formData.get("published") === "on",
    showInFooter: formData.get("showInFooter") === "on",
  });

  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/inhalte?saved=${parsed.data.slug}`);
}

export async function saveSettingsAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const locale = locOf(formData);
  const user = await requireAdmin(locale);

  const percent = Number(formData.get("feePercent"));
  const cap = String(formData.get("feeCap") ?? "").trim();
  const min = Number(formData.get("feeMin"));
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return { error: "invalid" };

  await writeSetting(user, "fee_rule", {
    percent,
    capCents: cap ? Math.round(Number(cap) * 100) : null,
    minCents: Number.isFinite(min) ? Math.round(min * 100) : defaultFeeRule.minCents,
  });

  const flags = { ...defaultFlags };
  for (const key of Object.keys(defaultFlags) as (keyof typeof defaultFlags)[]) {
    flags[key] = formData.get(`flag_${key}`) === "on";
  }
  await writeSetting(user, "flags", flags);

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function runOutboxAction(formData: FormData) {
  const locale = locOf(formData);
  await requireAdmin(locale);
  await runOutbox(100);
  revalidatePath(`/${locale}/admin`);
}

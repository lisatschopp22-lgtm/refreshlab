"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/auth/session";
import { PermissionError } from "@/domain/permissions";
import { RatingError, setRatingHidden, submitRating } from "@/domain/ratings";

export type RatingState = { error?: string; ok?: boolean };

export async function rateOrderAction(_prev: RatingState, formData: FormData): Promise<RatingState> {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);

  const parsed = z
    .object({
      orderId: z.string().uuid(),
      score: z.coerce.number().int().min(1).max(5),
      comment: z.string().max(1000).optional(),
    })
    .safeParse({
      orderId: formData.get("orderId"),
      score: formData.get("score"),
      comment: formData.get("comment") || undefined,
    });
  if (!parsed.success) {
    return { error: parsed.error.issues.some((issue) => issue.path[0] === "score") ? "no_score" : "invalid" };
  }

  try {
    await submitRating(user, parsed.data.orderId, {
      score: parsed.data.score,
      comment: parsed.data.comment,
    });
  } catch (error) {
    if (error instanceof RatingError) return { error: error.message };
    if (error instanceof PermissionError) return { error: "not_allowed" };
    throw error;
  }

  revalidatePath(`/${locale}/bestellung/${parsed.data.orderId}`);
  revalidatePath(`/${locale}/konto/bewertungen`);
  return { ok: true };
}

export async function hideRatingAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireAdmin(locale);
  const ratingId = String(formData.get("ratingId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const hidden = formData.get("hidden") === "1";

  await setRatingHidden(user, ratingId, hidden, String(formData.get("reason") ?? "") || undefined);
  revalidatePath(`/${locale}/bestellung/${orderId}`);
}

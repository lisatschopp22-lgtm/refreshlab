"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/auth/session";
import { PermissionError } from "@/domain/permissions";
import {
  approveSpecialRate,
  changeSpecialRate,
  endSpecialRate,
  grantSpecialRate,
  rejectSpecialRate,
  requestSpecialRate,
  SpecialRateError,
} from "@/domain/special-rates";

export type SpecialRateState = { error?: string; ok?: boolean };

const side = z.enum(["seller", "buyer"]);

export async function requestSpecialRateAction(_prev: SpecialRateState, formData: FormData): Promise<SpecialRateState> {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);

  const parsed = z
    .object({
      organisationId: z.string().uuid(),
      side,
      expectedPerYear: z.coerce.number().int().min(0).max(1_000_000).optional(),
      message: z.string().max(2000).optional(),
    })
    .safeParse({
      organisationId: formData.get("organisationId"),
      side: formData.get("side"),
      expectedPerYear: formData.get("expectedPerYear") || undefined,
      message: formData.get("message") || undefined,
    });
  if (!parsed.success) return { error: "invalid" };

  try {
    await requestSpecialRate(user, parsed.data.organisationId, {
      side: parsed.data.side,
      expectedPerYear: parsed.data.expectedPerYear ?? null,
      message: parsed.data.message ?? null,
    });
  } catch (error) {
    if (error instanceof SpecialRateError) return { error: error.message };
    if (error instanceof PermissionError) return { error: "not_allowed" };
    throw error;
  }

  revalidatePath(`/${locale}/konto/organisation`);
  return { ok: true };
}

/** Every admin decision on special rates goes through here; the intent says which. */
export async function specialRateAdminAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireAdmin(locale);
  const intent = String(formData.get("intent") ?? "");
  const id = String(formData.get("id") ?? "");
  const percent = Number(String(formData.get("percent") ?? "").replace(",", "."));
  const note = String(formData.get("note") ?? "") || undefined;
  const page = `/${locale}/admin/sonderkonditionen`;

  try {
    if (intent === "approve") await approveSpecialRate(user, id, percent, note);
    else if (intent === "reject") await rejectSpecialRate(user, id, note);
    else if (intent === "change") await changeSpecialRate(user, id, percent, note);
    else if (intent === "end") await endSpecialRate(user, id, note);
    else if (intent === "grant") {
      const chosen = side.safeParse(formData.get("side"));
      if (!chosen.success) throw new SpecialRateError("invalid");
      await grantSpecialRate(user, String(formData.get("organisationId") ?? ""), chosen.data, percent, note);
    }
  } catch (error) {
    if (error instanceof SpecialRateError) redirect(`${page}?error=${error.message}`);
    throw error;
  }

  revalidatePath(page);
  redirect(page);
}

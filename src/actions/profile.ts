"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { organisationMembers, organisations, profiles } from "@/db/schema/identity";
import { requireUser } from "@/auth/session";
import { recordAudit } from "@/domain/audit";
import { assert, canManageOrganisation } from "@/domain/permissions";
import { slugify, uniqueSlug } from "@/domain/slug";
import { uploadImage, UploadError } from "@/integrations/storage";

export type ProfileState = { error?: string; ok?: boolean };

export async function saveProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);

  const parsed = z
    .object({
      displayName: z.string().min(2).max(80),
      bio: z.string().max(600).optional(),
      city: z.string().max(80).optional(),
      country: z.string().max(2).optional(),
      uiLocale: z.enum(["de", "en"]),
    })
    .safeParse({
      displayName: formData.get("displayName"),
      bio: formData.get("bio") || undefined,
      city: formData.get("city") || undefined,
      country: formData.get("country") || undefined,
      uiLocale: formData.get("uiLocale") || "de",
    });
  if (!parsed.success) return { error: "invalid" };

  let avatarPath: string | undefined;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    try {
      avatarPath = await uploadImage(avatar, `avatars/${user.id}`);
    } catch (error) {
      return { error: error instanceof UploadError ? "upload" : "upload" };
    }
  }

  await db
    .update(profiles)
    .set({
      displayName: parsed.data.displayName,
      bio: parsed.data.bio ?? null,
      city: parsed.data.city ?? null,
      country: parsed.data.country?.toUpperCase() ?? null,
      locale: parsed.data.uiLocale,
      ...(avatarPath ? { avatarPath } : {}),
    })
    .where(eq(profiles.id, user.id));

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createOrganisationAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);

  const parsed = z
    .object({
      name: z.string().min(2).max(120),
      type: z.enum(["lab", "university", "company", "dealer", "service_provider"]),
      city: z.string().max(80).optional(),
      country: z.string().length(2),
      about: z.string().max(1200).optional(),
      website: z.string().max(200).optional(),
    })
    .safeParse({
      name: formData.get("name"),
      type: formData.get("type"),
      city: formData.get("city") || undefined,
      country: formData.get("country") || "CH",
      about: formData.get("about") || undefined,
      website: formData.get("website") || undefined,
    });
  if (!parsed.success) return { error: "invalid" };

  const existing = await db.select({ slug: organisations.slug }).from(organisations);
  const slug = uniqueSlug(slugify(parsed.data.name), new Set(existing.map((row) => row.slug)));

  const [organisation] = await db
    .insert(organisations)
    .values({
      name: parsed.data.name,
      slug,
      type: parsed.data.type,
      city: parsed.data.city ?? null,
      country: parsed.data.country.toUpperCase(),
      about: parsed.data.about ?? null,
      website: parsed.data.website ?? null,
    })
    .returning();

  await db.insert(organisationMembers).values({
    organisationId: organisation!.id,
    profileId: user.id,
    role: "owner",
  });

  await recordAudit({
    actorId: user.id,
    action: "organisation.created",
    targetType: "organisation",
    targetId: organisation!.id,
    summary: parsed.data.name,
  });

  revalidatePath("/", "layout");
  redirect(`/${locale}/konto/organisation`);
}

export async function addMemberAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const locale = String(formData.get("locale") ?? "de");
  const user = await requireUser(locale);
  const organisationId = String(formData.get("organisationId") ?? "");
  assert(canManageOrganisation(user, organisationId), "Not an owner");

  const email = z.email().safeParse(formData.get("email"));
  if (!email.success) return { error: "invalid" };

  const [member] = await db.select().from(profiles).where(eq(profiles.email, email.data)).limit(1);
  if (!member) return { error: "notfound" };

  await db
    .insert(organisationMembers)
    .values({ organisationId, profileId: member.id, role: "member" })
    .onConflictDoNothing();

  await recordAudit({
    actorId: user.id,
    action: "organisation.member_added",
    targetType: "organisation",
    targetId: organisationId,
    summary: member.email,
  });

  revalidatePath(`/${locale}/konto/organisation`);
  return { ok: true };
}

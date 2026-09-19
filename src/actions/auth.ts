"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles } from "@/db/schema/identity";
import { supabaseServer } from "@/auth/supabase-server";

export type ActionState = { error?: string; message?: string; ok?: boolean };

const credentials = z.object({
  email: z.email(),
  password: z.string().min(8),
});

const signUpSchema = credentials.extend({
  displayName: z.string().min(2).max(80),
});

function localeFrom(formData: FormData) {
  const locale = String(formData.get("locale") ?? "de");
  return locale === "en" ? "en" : "de";
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = localeFrom(formData);
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "invalid" };

  const supabase = await supabaseServer();
  const { error, data } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "credentials" };

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, data.user.id)).limit(1);
  if (profile?.suspendedAt) {
    await supabase.auth.signOut();
    return { error: "suspended" };
  }

  revalidatePath("/", "layout");
  redirect(String(formData.get("next") || `/${locale}/konto`));
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = localeFrom(formData);
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.path[0] === "password" ? "password" : "invalid" };
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.displayName, locale } },
  });
  if (error) return { error: "credentials" };

  revalidatePath("/", "layout");
  redirect(`/${locale}/konto`);
}

export async function magicLinkAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = localeFrom(formData);
  const email = z.email().safeParse(formData.get("email"));
  if (!email.success) return { error: "invalid" };

  const supabase = await supabaseServer();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${site}/${locale}/auth/callback` },
  });
  // Always the same answer, so the form cannot be used to probe for accounts.
  return { ok: true, message: "magicLinkSent" };
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = localeFrom(formData);
  const email = z.email().safeParse(formData.get("email"));
  if (!email.success) return { error: "invalid" };

  const supabase = await supabaseServer();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${site}/${locale}/auth/callback?next=/${locale}/konto/einstellungen`,
  });
  return { ok: true, message: "resetSent" };
}

export async function signOutAction(formData: FormData) {
  const locale = localeFrom(formData);
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(`/${locale}`);
}

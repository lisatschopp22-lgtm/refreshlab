import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organisationMembers, organisations, profiles } from "@/db/schema/identity";
import { supabaseServer } from "./supabase-server";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  locale: string;
  avatarPath: string | null;
  suspendedAt: Date | null;
  verifiedAt: Date | null;
  organisations: {
    id: string;
    name: string;
    slug: string;
    role: "owner" | "member";
    canPublish: boolean;
  }[];
};

/** Deduplicated per request: many components ask who is signed in. */
export const currentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  if (!profile) return null;

  const memberships = await db
    .select({
      id: organisations.id,
      name: organisations.name,
      slug: organisations.slug,
      role: organisationMembers.role,
      canPublish: organisationMembers.canPublish,
    })
    .from(organisationMembers)
    .innerJoin(organisations, eq(organisations.id, organisationMembers.organisationId))
    .where(eq(organisationMembers.profileId, user.id));

  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    locale: profile.locale,
    avatarPath: profile.avatarPath,
    suspendedAt: profile.suspendedAt,
    verifiedAt: profile.verifiedAt,
    organisations: memberships,
  };
});

export async function requireUser(locale = "de"): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect(`/${locale}/anmelden`);
  if (user.suspendedAt) redirect(`/${locale}/gesperrt`);
  return user;
}

export async function requireAdmin(locale = "de"): Promise<SessionUser> {
  const user = await requireUser(locale);
  if (user.role !== "admin") redirect(`/${locale}`);
  return user;
}

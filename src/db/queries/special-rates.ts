import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { organisations, profiles } from "@/db/schema/identity";
import { specialRates } from "@/db/schema/transactions";

const columns = {
  id: specialRates.id,
  organisationId: specialRates.organisationId,
  side: specialRates.side,
  status: specialRates.status,
  rateBp: specialRates.rateBp,
  expectedPerYear: specialRates.expectedPerYear,
  message: specialRates.message,
  decisionNote: specialRates.decisionNote,
  decidedAt: specialRates.decidedAt,
  endedAt: specialRates.endedAt,
  createdAt: specialRates.createdAt,
  organisationName: organisations.name,
  organisationSlug: organisations.slug,
  organisationType: organisations.type,
  requestedByName: sql<string | null>`(select display_name from ${profiles} where id = ${specialRates.requestedBy})`,
};

/** Everything the admin page needs: open requests, rates in force, and what was decided before. */
export async function specialRateOverview() {
  const rows = await db
    .select(columns)
    .from(specialRates)
    .innerJoin(organisations, eq(organisations.id, specialRates.organisationId))
    .orderBy(desc(specialRates.createdAt));
  return {
    open: rows.filter((row) => row.status === "requested"),
    active: rows.filter((row) => row.status === "approved"),
    history: rows.filter((row) => row.status === "rejected" || row.status === "ended").slice(0, 20),
  };
}

export async function openSpecialRateCount() {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(specialRates)
    .where(eq(specialRates.status, "requested"));
  return row?.count ?? 0;
}

export async function organisationsForSpecialRates() {
  return db
    .select({ id: organisations.id, name: organisations.name, type: organisations.type })
    .from(organisations)
    .orderBy(asc(organisations.name));
}

/** The organisations' requests and rates, newest first, for their own account page. */
export async function specialRatesOf(organisationIds: string[]) {
  if (!organisationIds.length) return [];
  return db
    .select(columns)
    .from(specialRates)
    .innerJoin(organisations, eq(organisations.id, specialRates.organisationId))
    .where(and(inArray(specialRates.organisationId, organisationIds)))
    .orderBy(desc(specialRates.createdAt));
}

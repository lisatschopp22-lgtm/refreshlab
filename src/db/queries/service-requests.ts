import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { serviceRequests } from "@/db/schema/operations";

/** For the badge in the admin menu. */
export async function openServiceRequestCount() {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(serviceRequests)
    .where(eq(serviceRequests.status, "open"));
  return row?.count ?? 0;
}

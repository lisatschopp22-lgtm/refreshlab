import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

declare global {
  var __refreshlabSql: ReturnType<typeof postgres> | undefined;
}

// Re-use the pool across hot reloads in dev.
const client =
  globalThis.__refreshlabSql ?? postgres(connectionString, { max: 10, prepare: false });
if (process.env.NODE_ENV !== "production") globalThis.__refreshlabSql = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export const sqlClient = client;
export { schema };
export type Db = typeof db;

import { sql } from "drizzle-orm";

/**
 * Drizzle renders a column inside a `sql` template without its table name.
 * Inside a correlated subquery that joins other tables, `"id"` is then
 * ambiguous and Postgres rejects the query. This forces the qualified form.
 */
export function qualified(reference: string) {
  const [table, column] = reference.split(".");
  return sql.raw(`"${table}"."${column}"`);
}

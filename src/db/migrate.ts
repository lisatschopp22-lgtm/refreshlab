import { readFileSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { DATABASE_URL } from "./env";

const url = DATABASE_URL;

async function main() {
  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  console.log("→ applying drizzle migrations");
  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("→ applying post-migrate.sql");
  const sqlText = readFileSync(join(process.cwd(), "src/db/sql/post-migrate.sql"), "utf8");
  await client.unsafe(sqlText);

  await client.end();
  console.log("✓ database up to date");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

#!/usr/bin/env node
/** Removes every fetched third-party photograph: cache, storage and manifest. */
import { rmSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data } = await supabase.storage.from("images").list("reference", { limit: 1000 });
if (data?.length) {
  await supabase.storage.from("images").remove(data.map((entry) => `reference/${entry.name}`));
  console.log(`removed ${data.length} images from storage`);
}

rmSync("supabase/reference-cache", { recursive: true, force: true });
rmSync("supabase/reference-images.json", { force: true });
console.log("✓ reference images cleared — re-seed to go back to the placeholders");

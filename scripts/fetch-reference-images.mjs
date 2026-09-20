#!/usr/bin/env node
/**
 * Fetches real laboratory-equipment photographs so the prototype can be judged
 * with something other than generated placeholders.
 *
 *   npm run images:fetch                        # Wikimedia Commons (default)
 *   npm run images:fetch -- --source labfinder  # labfinder.ch
 *   npm run db:seed -- --images reference
 *   npm run images:clear                        # remove them again
 *
 * Two sources, because they differ in what you may do with the result:
 *
 *   commons    Wikimedia Commons. Openly licensed, and the licence and author
 *              of every file are recorded in the manifest. Searched per
 *              equipment category, so a centrifuge listing gets a centrifuge.
 *              This is the default and the only one that could ever ship.
 *
 *   labfinder  labfinder.ch. Third-party product photographs that are not ours
 *              to redistribute: fine for looking at a layout on this machine,
 *              nothing else. That site is a directory rather than a catalogue,
 *              so it yields few distinct images.
 *
 * Either way nothing is committed: the cache and the manifest are gitignored,
 * and the generated placeholders stay the default so a fresh clone never
 * depends on someone else's pictures.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

// Wikimedia asks crawlers to identify themselves. No personal contact details
// go to a third party from here.
const UA =
  "refreshLab-design-prototype/0.1 (local, unpublished design prototype; low volume)";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};

const SOURCE = flag("source", "commons");
const PER_CATEGORY = Number(flag("per-category", 10));
const PAGES = Number(flag("pages", 120));
const CACHE = "supabase/reference-cache";
const MANIFEST = "supabase/reference-images.json";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(url, asBuffer = false, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    const response = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
    if (response.status === 429 || response.status === 503) {
      await sleep(2000 * attempt);
      continue;
    }
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    return asBuffer ? Buffer.from(await response.arrayBuffer()) : response.text();
  }
  throw new Error(`gave up after ${tries} tries: ${url}`);
}

/** What to search Commons for, per category in the seed catalogue. */
const searches = {
  zentrifugen: ["centrifuge laboratory", "benchtop centrifuge"],
  chromatographie: ["chromatography instrument", "HPLC system", "gas chromatograph"],
  mikroskopie: ["laboratory microscope", "optical microscope instrument"],
  spektroskopie: ["spectrometer laboratory", "spectrophotometer"],
  "pcr-thermocycler": ["thermal cycler PCR", "PCR machine laboratory"],
  "kuehlung-lagerung": ["laboratory freezer", "ultra low temperature freezer"],
  "inkubatoren-schuettler": ["laboratory incubator", "shaking incubator"],
  waagen: ["analytical balance laboratory", "precision balance scale"],
  "liquid-handling": ["laboratory pipette", "micropipette"],
  sterilisation: ["autoclave laboratory", "steriliser laboratory"],
  zellkultur: ["laminar flow cabinet", "biosafety cabinet"],
  probenvorbereitung: ["rotary evaporator", "laboratory glassware apparatus"],
};

async function fromCommons() {
  const results = [];
  const seen = new Set();

  for (const [category, terms] of Object.entries(searches)) {
    let taken = 0;

    for (const term of terms) {
      if (taken >= PER_CATEGORY) break;

      const url =
        "https://commons.wikimedia.org/w/api.php?" +
        new URLSearchParams({
          action: "query",
          generator: "search",
          gsrsearch: `filetype:bitmap ${term}`,
          gsrnamespace: "6",
          gsrlimit: "30",
          prop: "imageinfo",
          iiprop: "url|extmetadata|size",
          iiurlwidth: "1100",
          format: "json",
        });

      try {
        const payload = JSON.parse(await get(url));
        const pages = Object.values(payload.query?.pages ?? {});

        for (const page of pages) {
          if (taken >= PER_CATEGORY) break;
          const info = page.imageinfo?.[0];
          if (!info?.thumburl) continue;
          // Wide banners and tall diagrams both look wrong in a 4:3 card.
          const ratio = info.width / info.height;
          if (ratio < 0.6 || ratio > 2.2) continue;
          if (seen.has(page.title)) continue;
          seen.add(page.title);

          const meta = info.extmetadata ?? {};
          const strip = (value) => (value ? String(value).replace(/<[^>]*>/g, "").trim() : null);

          results.push({
            category,
            title: page.title.replace(/^File:/, ""),
            url: info.thumburl,
            page: info.descriptionurl,
            licence: strip(meta.LicenseShortName?.value) ?? "see source",
            author: strip(meta.Artist?.value)?.slice(0, 120) ?? "unknown",
          });
          taken += 1;
        }
      } catch (error) {
        console.warn(`  ! ${category} / ${term}: ${error.message}`);
      }

      // Wikimedia's rate limits are generous but not unlimited.
      await sleep(1100);
    }

    console.log(`  ${category}: ${taken}`);
  }

  return results;
}

const REJECT = /logo|favicon|badge|icon|cropped|hero|screenshot|banner|placeholder|avatar|sprite/i;
const stripSize = (url) => url.replace(/-\d{2,4}x\d{2,4}(?=\.[a-z]+$)/i, "");
const pixels = (url) => {
  const match = url.match(/-(\d{2,4})x(\d{2,4})(?=\.[a-z]+$)/i);
  return match ? Number(match[1]) * Number(match[2]) : Number.MAX_SAFE_INTEGER;
};

async function fromLabfinder() {
  console.log("→ reading the sitemap");
  const sitemap = await get("https://labfinder.ch/product_lab-sitemap.xml");
  const all = [...sitemap.matchAll(/<loc>(https:\/\/labfinder\.ch\/de\/[^<]+)<\/loc>/g)].map(
    (match) => match[1],
  );
  const stride = Math.max(1, Math.floor(all.length / PAGES));
  const chosen = all.filter((_, index) => index % stride === 0).slice(0, PAGES);
  console.log(`→ visiting ${chosen.length} of ${all.length} pages`);

  const best = new Map();
  for (const [index, page] of chosen.entries()) {
    try {
      const html = await get(page);
      for (const match of html.matchAll(
        /https:\/\/labfinder\.ch\/wp-content\/uploads\/[^"'\s),]+\.(?:jpg|jpeg|png|webp)/gi,
      )) {
        const url = match[0];
        if (REJECT.test(url)) continue;
        const key = stripSize(url);
        const previous = best.get(key);
        if (!previous || pixels(url) > pixels(previous.url)) best.set(key, { url, page });
      }
    } catch (error) {
      console.warn(`  ! ${page}: ${error.message}`);
    }
    if ((index + 1) % 20 === 0) console.log(`  ${index + 1}/${chosen.length}, ${best.size} images`);
    await sleep(700);
  }

  return [...best.values()].map((entry) => ({
    category: null,
    title: stripSize(entry.url).split("/").pop(),
    url: entry.url,
    page: entry.page,
    licence: "© labfinder.ch or its suppliers — local comping only",
    author: "labfinder.ch",
  }));
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

async function main() {
  console.log(`→ source: ${SOURCE}`);
  rmSync(CACHE, { recursive: true, force: true });
  mkdirSync(CACHE, { recursive: true });

  const candidates = SOURCE === "labfinder" ? await fromLabfinder() : await fromCommons();
  console.log(`→ downloading ${candidates.length} images`);

  const downloaded = [];
  for (const [index, candidate] of candidates.entries()) {
    const name = `${String(index).padStart(3, "0")}-${slugify(candidate.title) || "image"}.jpg`;
    const raw = join(CACHE, `raw-${index}`);
    const out = join(CACHE, name);

    try {
      writeFileSync(raw, await get(candidate.url, true));
      // sips ships with macOS, so no image dependency is needed.
      execFileSync(
        "sips",
        ["-Z", "1100", "--setProperty", "format", "jpeg", raw, "--out", out],
        { stdio: "ignore" },
      );
      rmSync(raw, { force: true });

      // Anything this small is an icon that slipped through.
      if (statSync(out).size < 8_000) {
        rmSync(out, { force: true });
        continue;
      }
      downloaded.push({ ...candidate, file: name });
    } catch (error) {
      rmSync(raw, { force: true });
      console.warn(`  ! ${candidate.title}: ${error.message}`);
    }
    await sleep(SOURCE === "commons" ? 260 : 120);
  }

  console.log(`→ uploading ${downloaded.length} images to local storage`);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const uploaded = [];
  for (const entry of downloaded) {
    const path = `reference/${entry.file}`;
    const { error } = await supabase.storage
      .from("images")
      .upload(path, new Blob([readFileSync(join(CACHE, entry.file))], { type: "image/jpeg" }), {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (error) {
      console.warn(`  ! ${path}: ${error.message}`);
      continue;
    }
    uploaded.push({ ...entry, path });
  }

  writeFileSync(
    MANIFEST,
    JSON.stringify(
      {
        note:
          SOURCE === "commons"
            ? "Openly licensed photographs from Wikimedia Commons. Licence and author " +
              "are recorded per image; keep the attribution if any of this is published."
            : "Third-party photographs fetched for local design comping only. Not ours " +
              "to redistribute, not committed. Run `npm run images:clear` to remove them.",
        source: SOURCE,
        fetchedAt: new Date().toISOString(),
        count: uploaded.length,
        images: uploaded,
      },
      null,
      2,
    ) + "\n",
  );

  console.log(`✓ ${uploaded.length} images ready`);
  console.log("  next: npm run db:seed -- --images reference");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

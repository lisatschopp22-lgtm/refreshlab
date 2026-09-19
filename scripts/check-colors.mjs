#!/usr/bin/env node
/**
 * The brand colour is an open question, so no component may hard-code one.
 * Colours live in src/ui/tokens.css and reach components only as semantic
 * tokens. This fails the build on any raw colour that slips in.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const allowedFiles = new Set([
  "src/ui/tokens.css",
  "src/app/globals.css",
  // Email clients cannot resolve CSS custom properties; that template keeps
  // its own neutral literals and states why.
  "src/integrations/email.ts",
]);

// Tailwind palette utilities (bg-green-600, text-red-500 …) and raw CSS colours.
const patterns = [
  {
    name: "Tailwind palette colour",
    re: /\b(?:bg|text|border|ring|fill|stroke|from|via|to|decoration|outline|shadow|accent|caret|divide|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g,
  },
  { name: "hex colour", re: /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g },
  { name: "rgb()/hsl() literal", re: /\b(?:rgba?|hsla?)\(\s*\d/g },
  { name: "named colour utility", re: /\b(?:bg|text|border)-(?:white|black)\b/g },
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (/\.(tsx?|css)$/.test(entry)) files.push(full);
  }
  return files;
}

const violations = [];
for (const file of walk(join(root, "src"))) {
  const rel = relative(root, file);
  if (allowedFiles.has(rel)) continue;
  const source = readFileSync(file, "utf8");
  source.split("\n").forEach((line, index) => {
    // The placeholder generator draws SVGs and needs literal colours.
    if (rel.includes("seed/images")) return;
    for (const { name, re } of patterns) {
      re.lastIndex = 0;
      const match = re.exec(line);
      if (match) violations.push({ rel, line: index + 1, name, text: match[0] });
    }
  });
}

if (violations.length) {
  console.error(`✗ ${violations.length} hard-coded colour(s). Use a token from src/ui/tokens.css.\n`);
  for (const v of violations) console.error(`  ${v.rel}:${v.line}  ${v.name}: ${v.text}`);
  process.exit(1);
}
console.log("✓ no hard-coded colours outside the token files");

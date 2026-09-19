# Decisions

One line per decision: date · decision · why. Started 2026-09-19.

- 2026-09-19 · Colour is a runtime palette, not a constant · The brand hue is undecided, so components use semantic tokens only and `npm run check` fails on raw colours. Four palettes ship; green is one of them, not the default in code.
- 2026-09-19 · Locale routing without middleware · Next 16 renamed `middleware.ts` to `proxy.ts`. next-intl works with a `[locale]` segment and `setRequestLocale`, so the prototype avoids that moving API entirely; `/` redirects to `/de`.
- 2026-09-19 · Email confirmation off for local sign-up · Registration would otherwise need a Mailpit round trip in every e2e run. Magic link and password reset still exercise real mail.
- 2026-09-19 · Drizzle columns are qualified by hand inside `sql` templates · Drizzle renders `${table.column}` unqualified, which is ambiguous in a correlated subquery that joins other tables. See the `qualified()` helper in `src/db/queries/catalogue.ts`.
- 2026-09-19 · Placeholder images are generated SVGs in real storage · The prototype has no photographs, but grey boxes make cards and galleries impossible to judge. The seed uploads 201 generated technical illustrations to Supabase Storage, so the storage path is genuinely exercised.
- 2026-09-19 · `search_text` is a trigger-maintained column, `search_vector` is generated from it · Lets the listing trigger cover edits while the outbox reindex covers catalogue renames, which a row trigger cannot see.

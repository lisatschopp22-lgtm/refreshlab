# Decisions

One line per decision: date · decision · why. Started 2026-09-19.

- 2026-09-19 · Colour is a runtime palette, not a constant · The brand hue is undecided, so components use semantic tokens only and `npm run check` fails on raw colours. Four palettes ship; green is one of them, not the default in code.
- 2026-09-19 · Locale routing without middleware · Next 16 renamed `middleware.ts` to `proxy.ts`. next-intl works with a `[locale]` segment and `setRequestLocale`, so the prototype avoids that moving API entirely; `/` redirects to `/de`.
- 2026-09-19 · Email confirmation off for local sign-up · Registration would otherwise need a Mailpit round trip in every e2e run. Magic link and password reset still exercise real mail.
- 2026-09-19 · Drizzle columns are qualified by hand inside `sql` templates · Drizzle renders `${table.column}` unqualified, which is ambiguous in a correlated subquery that joins other tables. See the `qualified()` helper in `src/db/queries/catalogue.ts`.
- 2026-09-19 · Placeholder images are generated SVGs in real storage · The prototype has no photographs, but grey boxes make cards and galleries impossible to judge. The seed uploads 201 generated technical illustrations to Supabase Storage, so the storage path is genuinely exercised.
- 2026-09-19 · `search_text` is a trigger-maintained column, `search_vector` is generated from it · Lets the listing trigger cover edits while the outbox reindex covers catalogue renames, which a row trigger cannot see.
- 2026-09-19 · Search state lives in the URL, in German param names · Results stay shareable and server-rendered, and the param names match the visible routes (`zustand`, `hersteller`, `kategorie`). English aliases are accepted too.
- 2026-09-19 · Filtered search pages are `noindex, follow` · They are thin and near-duplicate. Category, manufacturer, model and listing pages carry the indexable content.
- 2026-09-19 · robots.txt names AI crawlers explicitly · Which crawlers may read public catalogue data is a commercial decision; a bare wildcard hides it. GPTBot, ClaudeBot, PerplexityBot and Google-Extended are listed so the choice is visible and revocable.
- 2026-09-20 · `proxy.ts` refreshes the Supabase session, nothing else · Next 16 renamed middleware to proxy. Without a refresh the prototype session expires after an hour mid-test. Locale routing deliberately stays out of it.
- 2026-09-20 · The required marker sits outside the `<label>` element · Inside it, the label's text becomes "Preis*", which breaks both screen-reader announcement and `getByLabel`. The input's own `required` carries the semantics.
- 2026-09-20 · A proposed model gets a `pending` catalogue record immediately · The seller must not be blocked while the catalogue is reviewed, so the listing can be published while the model record waits for approval. Its record number is suffixed `-P`.
- 2026-09-20 · Personal profiles are `noindex` · They carry a real person's name. Organisation pages are indexable, because they are businesses.

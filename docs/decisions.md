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
- 2026-09-20 · Comments nest one level only · A reply to a reply attaches to its root. Deep threads make a technical Q&A hard to scan, and the mockups show a flat question-and-answer shape.
- 2026-09-20 · Messages poll every five seconds instead of using Realtime · Enough to judge the behaviour, and it keeps the prototype free of a live subscription to reason about. Supabase Realtime remains a Phase 7 option.
- 2026-09-20 · A form must not unmount while its action is in flight · `useActionState`'s dispatch returns void, so awaiting it and then closing the form silently cancelled replies. Forms now close on the action's `ok` result.
- 2026-09-20 · Mailpit's SMTP port has to be published explicitly · `supabase/config.toml` ships it commented out, so only the web interface was reachable and every notification failed with ECONNREFUSED.
- 2026-09-20 · Controls that do different things get different labels · A reply toggle and a reply submit both reading "Antworten" is ambiguous for anyone navigating by button name.
- 2026-09-20 · Confirming receipt releases the payout · Stripe explicitly does not provide escrow, so holding the money until the buyer confirms is a marketplace rule enforced in `src/domain/orders.ts`, not a banking guarantee. `buyerConfirmsReceipt` remains a flag.
- 2026-09-20 · Who may make each transition is part of the state machine · A seller cannot confirm receipt for the buyer, a buyer cannot mark an item shipped, and only an admin resolves a dispute. Keeping this in the domain, not the UI, is what the unit tests check.
- 2026-09-20 · An accepted offer reserves the listing, completion sells it · A cancelled or refunded order puts it back on the market. The listing status follows the transaction rather than being set by hand.
- 2026-09-20 · The e2e suite reseeds before it runs · The journeys buy and sell real rows, so they are not idempotent. Without a reset, a second run finds its fixtures already sold. `E2E_SKIP_SEED=1` opts out while iterating.
- 2026-09-20 · Storage is cleared through the Storage API · Supabase now rejects `delete from storage.objects`, so the seed lists and removes the folders it owns instead.
- 2026-09-20 · An administrator cannot suspend themselves or drop their own admin rights · Either one locks the last administrator out of the console. The guard is in `src/domain/admin.ts`, not in the template.
- 2026-09-20 · Merging a model moves its listings and leaves a pointer · The duplicate keeps `merged_into_id` so old links still resolve, and every moved listing is re-indexed.
- 2026-09-20 · Every admin query is covered by an integration test · Correlated subqueries written by hand fail only at runtime, and the ambiguous-column bug appeared twice. Running each query once in CI is what catches it.
- 2026-09-20 · The ops console defaults to graphite dark · It is a palette, not a separate design, so the switcher still overrides it and every other palette renders.

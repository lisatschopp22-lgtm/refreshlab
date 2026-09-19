# Progress

## Phase 0 — Foundation ✓

Runs from a clean clone. Next.js 16 app on the local Supabase stack, 25 tables,
deterministic seed (67 models, 150 listings, 22 accounts, orders in every
state), four runtime palettes, `/de/design` gallery, 27 unit and integration
tests.

Try it: `npm run db:reset && npm run dev`, then http://localhost:3000/de/design
and switch palette with the control at the bottom right.

## Phase 1 — Public catalogue and search ✓

* Home page with search, category tiles, featured and latest listings.
* Search with a facet rail (category, condition, manufacturer, country, sale
  type, trust), four sorts, grid and list layouts, pagination, empty state.
  Facet counts exclude their own dimension, so no filter is a dead end.
* Listing detail, equipment model record, category, manufacturer, catalogue
  index and Markdown content pages, all server-rendered.
* SEO: per-page metadata, canonicals, Open Graph, Product/Offer/Organization/
  BreadcrumbList JSON-LD in the initial HTML, 448-URL sitemap with hreflang,
  explicit robots policy, and a paged public JSON feed at
  `/api/feed/listings`.

Try it: http://localhost:3000/de/suche?q=zentrifuge, then narrow by a facet.
`curl -s localhost:3000/api/feed/listings?perPage=2 | python3 -m json.tool`

Not done in this phase: comments render on model and listing pages from
Phase 3; the buy, offer and contact buttons link to routes built in Phases 2–4.

## Phase 2 — Accounts, organisations, selling ✓

* Sign-up, sign-in, magic link and password reset through Supabase Auth, with
  all mail landing in Mailpit. `proxy.ts` keeps the session fresh.
* Authorisation lives in one module, `src/domain/permissions.ts`. Nothing
  writes to the database except through `src/domain/*`.
* Account area: dashboard with live counts, my listings with status tabs and
  status changes, watchlist, saved searches, profile settings with avatar
  upload, organisations with members.
* Four-step sell wizard after mockup S6: find the model in the catalogue (with
  typeahead and "propose a new model"), condition and documents with real
  uploads to Supabase Storage, price and sale type with a comparable-price
  hint, then review showing the platform fee and what the seller receives.
* Publishing is refused with a named list of what is missing.
* Public organisation and personal profile pages.

Try it: sign in as `beat.seller@refreshlab.local` (password `refreshlab`),
then http://localhost:3000/de/verkaufen

J2 passes as two Playwright tests, including a real file upload.

## Phase 3 — Comments and private messages ✓

* Threaded comments on equipment models and on listings, one level deep, with
  edit, delete, moderation hiding and reporting. The seller is labelled as
  such on their own listing.
* Private messages: "Contact seller" opens or reuses the thread for that
  listing. Inbox with unread counts, thread view with attachments, block and
  unblock, and a five-second poll.
* Anti-abuse: you cannot message yourself, blocked parties cannot write, and
  a ten-messages-per-minute cap lives in the domain layer.
* A transactional outbox drives search re-indexing and notification mail.
  `/api/jobs/run` drains it; in development an interval calls it every five
  seconds. Every mail lands in Mailpit at http://127.0.0.1:54324.

Try it: sign in as `anna.buyer@refreshlab.local`, open any listing by Beat
Hunziker, press "Verkäufer kontaktieren", then sign in as
`beat.seller@refreshlab.local` in a second browser profile to answer.

J3 passes as four Playwright tests, including a genuine two-session exchange
and a check that the notification reached the mail server.

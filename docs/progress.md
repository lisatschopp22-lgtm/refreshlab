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

## Phase 4 — Offers, orders and payments ✓

* Offer state machine: make, counter, accept, decline, withdraw, expire. A
  minimum price is never shown but refuses a lower offer immediately, and every
  offer event is mirrored into the message thread (mockup S9).
* Order state machine with the five milestones from mockup S10: offer,
  payment, shipping, check, payout. Cancellation, dispute and refund branches
  included. Who may make each move is part of the machine.
* `PaymentProvider` with a fake default and Stripe Connect in test mode. The
  fake provider serves a local checkout page with a deliberate "let it fail"
  button, and simulates a bank transfer an admin confirms. Stripe uses separate
  charges and transfers, with webhook idempotency on the event id.
* Invoices for both parties with the platform fee and the seller's net shown
  separately. Dispute handling reserved to administrators.

Try it: sign in as `anna.buyer@refreshlab.local`, open a listing by Beat
Hunziker, make an offer, then sign in as `beat.seller@refreshlab.local` to
counter it.

J4 passes as three Playwright tests covering the full negotiation, a failed
payment and a dispute. 44 unit and integration tests, 16 e2e tests.

## Phase 5 — Administration and moderation ✓

Requirement R9 in full. The ops console at `/de/admin`, styled after mockup
S19, defaults to the graphite dark palette but works in every palette.

* Overview with KPIs, a risk-ordered moderation queue and marketplace metrics
  (listings with offers, median days to sell, dispute rate).
* Users: search, verify, suspend with a reason, promote and demote, and a
  detail page listing everything that person created.
* Listings: approve pending, verify, feature, hide and restore, filter by
  status, including soft-deleted ones.
* Equipment data: approve proposed models and merge duplicates, which moves
  the listings and re-indexes them.
* Comments, transactions and disputes, organisations, reports with resolution
  notes.
* Content pages edited as Markdown per language, with publish and footer
  toggles, live on the public site immediately.
* Settings: the fee rule with a worked example table, and every feature flag.
* Audit log showing actor, action, target and a readable before/after diff.

Try it: sign in as `admin@refreshlab.local` and open
http://localhost:3000/de/admin

J5 passes as four Playwright tests, including that every moderation action
lands in the audit log and that an admin cannot lock themselves out.

## Phase 6 — Test harness and design experiments ✓

* All five journeys run as 20 Playwright tests, on top of 59 unit and
  integration tests. The suite re-seeds first, so it is repeatable.
* Flags moved from environment-only to admin settings with an environment
  override, so a behaviour can be switched while the prototype is running.
  The fee rule is editable in the same screen, with a worked example table.
* `npm run screenshots` produces 63 images: every key screen in four palettes,
  light and dark, plus mobile widths.
* Volume tested at 5,000 listings. Removing two redundant ILIKE clauses from
  the search predicate, which were forcing a sequential scan, took text search
  from 860 ms to 180 ms in a production build. `SEARCH_DEBUG=1` prints the
  timing of each part of a search.

Measured in a production build, 5,000 listings, warm:

| Page | Time |
|---|---|
| Home | 55 ms |
| Search, facet filter only | 40 ms |
| Search, text query | 180 ms |
| Catalogue feed, text query | 150 ms |

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

## Verification

Checked on 2026-09-20 against the finished prototype:

* `npm run db:reset` rebuilds the database from nothing in 48 seconds.
* `npm run check` passes: lint, strict typecheck, colour guard, 59 unit and
  integration tests.
* `npm run e2e` passes: 20 journey tests covering J1 to J5.
* `npm run build` produces a clean production build of 44 routes.
* No browser console errors on the home, search, catalogue, listing, model,
  organisation or design pages.

One flaky e2e run was observed while the dev server was recompiling an edit
mid-suite; the two runs after it were clean.

Not done: Lighthouse scores were never captured, so the Performance, SEO and
Accessibility targets in the build instructions are unverified. The page
timings in the Phase 6 table were measured with `curl` against a production
build instead.

## Design options, extended

The switcher went from four dimensions to seven, and from four palettes to
twelve.

* **Palettes**: botanical, moss, clinical, ocean, aqua, ember, copper,
  crimson, plum, graphite, slate, ink. The last two are near-neutral and
  monochrome, so a layout can be judged with no brand colour at all.
* **Typefaces**: Inter, IBM Plex Sans, Space Grotesk headings, Source Serif
  headings, and the system stack. The display face is separate from the body
  face, which is what makes the serif option read as an academic dossier
  rather than a different website.
* **Shape** (sharp, soft, round), **depth** (flat, raised, lifted),
  **density** (compact, comfortable, roomy) and **contrast** (normal, high).
  Each is one multiplier or a small token override, not a second stylesheet.
* The panel gained a shuffle, a reset and a copy-link button, and now shows
  each palette as a real swatch rather than a word.
* `/de/design` lists every option as a link, so combinations can be opened in
  two tabs and compared.

`npm run screenshots` now produces 109 images, including a `looks/` folder
that holds shape, depth, typeface and density at a fixed colour.

## Logo proposals

Eighteen lockups at `/de/design/logo`, selectable like any other design
dimension and shown in the real header rather than on a white page.

* **From the reference photograph**: `instrument` (the benchtop device reduced
  to four parts) and `bench` (the whole scene).
* **From the equipment itself**: `rotor`, `flask`, `beaker`, `microscope`,
  `magnifier`, `sprout` (a seedling in a test tube), `molecule`, `hex`.
* **From what the marketplace does**: `spin` (the cycle alone), `balance`
  (what an instrument is worth), `tag` (every unit carries a record).
* **From the people**: `pipette`, the scientist at the bench from the
  silhouette sheet, and `pipette-badge`, the same figure reversed out of a
  filled rounded tile so the colour surrounds her.
* **Typographic**: `wordmark`, `brackets`, `lower`, `mono`, plus `badge` for
  an app icon.

Each mark is drawn on the same 24-unit grid with the same stroke, and the
gallery shows all of them at 64, 32 and 20 pixels so a favicon candidate can
be judged. Marks inherit the palette; wordmarks inherit the typeface.

## Real photographs

`npm run images:fetch` replaces the generated placeholders with real
laboratory-equipment photographs, which is the difference between judging a
layout and judging how the site feels.

* **Wikimedia Commons by default**, searched per equipment category, so a
  centrifuge listing shows a centrifuge. 95 images across all twelve
  categories, every one openly licensed, with licence and author recorded.
* **labfinder.ch with `--source labfinder`**, as suggested. That site turns
  out to be a directory rather than a catalogue: 40 product pages yielded 21
  distinct photographs, most of them repeated sponsor blocks. Those images are
  also not ours to publish.
* Nothing is committed. The cache and manifest are gitignored and the
  placeholders stay the default, so a fresh clone still works offline.
* `npm run images:clear` removes them again.

Both crawlers identify themselves, respect the robots policy and pace their
requests. No personal contact details are sent to either site.

## Three ways in: open marketplace, qualified equipment, spare parts store

The product owner's model of the marketplace, as copy and navigation.

* **Home**: three buttons in the hero (`Geräte einkaufen`, `Qualifizierte
  Geräte`, `Ersatzteillager`) and, directly below it, a section explaining
  what a qualified instrument is.
* **`/de/qualifizierte-geraete`**: the same explanation plus the listings.
  Only firms accredited by refreshLab may offer here; the qualifying firm
  gives a warranty of 3 to 24 months, either on the complete instrument or on
  named components.
* **`/de/ersatzteillager`**: equipment declared defective, offered as a donor
  for parts.
* **`/de/verbrauchsmaterialien`**: surplus consumables from projects,
  over-orders and cleared laboratories. The page states what belongs there
  (tangible, non-hazardous material) and what does not (chemicals), and lists
  nothing yet.
* The main navigation moved to a row of its own, because six entries no
  longer fit beside the search field.

Skipped: accreditation, the qualifying firm and the warranty scope have no
fields. The qualified page lists verified listings with a warranty as a
stand-in (14 in the seed), the store lists condition `for_parts` (11).
Consumables cannot be listed at all, because a listing needs an equipment
model. The new pages have no Playwright test yet.

## Catalogue: device types, consumables and 291 manufacturers

The catalogue now covers what large laboratory suppliers carry, read from
Carl Roth, VWR, Faust and TH.GEYER as orientation.

* **22 categories, 147 device types**: `/de/kategorie/zentrifugen` lists its
  device types; `/de/kategorie/tischzentrifugen` shows only those. 52 seeded
  models are filed under their device type.
* **12 groups of consumables with 70 kinds**, shown on
  `/de/verbrauchsmaterialien`. Chemicals are not among them.
* **291 manufacturers**, grouped from A to Z on `/de/katalog`.
* Proposing a new model now offers the device types as well.
* `npm run db:catalogue` brings a database in use up to date without wiping
  it; `npm run db:seed` uses the same sync.

Skipped: device types have no introduction of their own and borrow their
parent's. Nothing can be listed under consumables yet.

## New instruments are checked; the serial number is mandatory

* **Selling an unknown instrument**: step 1 of `/de/verkaufen` offers "Neues
  Gerät anlegen". The form takes an existing manufacturer or a new one (name,
  website), a device type and the model name.
* **Review instead of publishing**: such a listing is submitted with "Zur
  Prüfung einreichen" and shows as "In Prüfung" under "Meine Inserate".
* **Administration**: `/de/admin/geraetedaten` lists new instruments with
  their device type and new manufacturers (approve, or merge into an
  existing one). Approving a model publishes its manufacturer and releases
  the waiting listings. `/de/admin/inserate?status=pending_review` links to
  each listing's serial number photo.
* **Serial number photo**: required in step 2 of every new listing, stored
  privately, never shown on the public page.

Tried by hand with the seeded seller and admin: propose with a new
manufacturer, upload a photo and the serial plate, submit, see it in review,
approve, see it go live. The test rows were removed afterwards. There is no
Playwright journey for the review path yet; J2 now uploads a serial photo.

## Condition step, shorter

* The serial number photo now sits directly under the condition notes in
  step 2 of selling, followed by year and operating hours.
* "Lieferumfang" and "Beschreibung" are gone from the form; the hint under
  the condition notes asks for what is included instead.

Tried by hand with the seeded seller: the fields below the photo still save
with the form, and older texts stay in place.

## Fees split between seller and buyer

* **5 % per sale**: 3 % comes off the seller's payout, 2 % is added to
  what the buyer pays. Admin → Einstellungen sets both shares, an optional
  cap and a minimum, with a table of examples.
* **Shown where it matters**: the listing ("zzgl. 2% Plattformgebühr"),
  step 4 of selling (seller's share, payout, and what the buyer adds),
  checkout, order page and invoice (both shares, total, payout).
* **Stored per order**: new column `buyer_fee_cents`; the existing
  `fee_cents` is the seller's share. Stripe gets the buyer's share as a
  second line item and transfers the net after the seller's share.
* The home page states the rule from the settings; the seeded pages were
  reworded by the migration.

Tried by hand: a CHF 400 purchase as the seeded buyer showed CHF 8 buyer fee,
CHF 408 total, CHF 12 seller fee and CHF 388 payout on checkout, order page
and invoice. The test order was cancelled and removed afterwards.

## Ratings between buyer and seller

* **After a completed purchase** the order page asks both sides for one to
  five stars and an optional comment, open for 14 days. The two ratings
  appear together once both have rated, or when the 14 days are over.
* **Where they show**: under the seller's name on every listing, on the
  personal profile (as seller and as buyer) and on the provider page, each
  with the latest ratings.
* **Account**: a new page `/de/konto/bewertungen` lists ratings still to give,
  received and given; the overview points to open ones.
* **E-mail**: completing an order asks both sides to rate; a new rating
  notifies the person rated.
* **Moderation**: an admin sees both ratings on the order page and can hide
  one with a reason, or show it again.
* The seed rates its completed order from both sides; the same two ratings
  were added to the database in use.

Tried by hand with the seeded buyer, seller and admin: buy, pay, ship,
confirm receipt, rate from both sides (each rating stays hidden until the
other is in), see the stars on listing and profile, hide and show as admin.
The test purchase and its ratings were removed afterwards. J4 now rates from
both sides; Playwright could not run here.

## Volume tiers and special rates

* **3 % from each side**, with a tier for those who trade a lot: 0.1 points
  off for every 100 completed transactions in that role, at most 0.5. Admin →
  Einstellungen sets base rates and tiers and shows a table of the steps.
* **Account overview**: "Ihre Plattformgebühren" shows the own rate when
  buying and selling, the completed transactions and where the next step is.
* **Special rates**: an organisation's owner asks for one on
  `/de/konto/organisation` (selling for dealers only, buying for any
  organisation). Admin → Sonderkonditionen lists open requests to approve
  with a rate or reject, the rates in force to change or end, a form to set
  one directly, and the history. Both sides get an e-mail.
* **Orders** store the rates applied; checkout, order page and invoice show
  them, and a purchase at a company's buying rate names the company.
* The home page and the seeded pages describe the new rule. BioRefurb's
  example request is waiting in the admin area.

Tried by hand: the dealer's request, the admin's dealer-only rule, setting
and changing a buying rate for LifeScience Basel AG, and a purchase by one of
its members at that rate (checkout and invoice). The test purchase and the
test rate were removed afterwards.

## Several watchlists

* **On a listing**: "Merken" saves to the first list with one click, as
  before. The arrow next to it shows every list with a tick or a plus, and a
  field to start a new list that the listing goes straight into.
* **Account → Merkliste**: the lists as tabs with their counts, a field for a
  new list, renaming, deleting with a confirmation, and per listing "Entfernen"
  and "Verschieben nach" another list.
* What was saved before sits in each person's first list.

Tried by hand with the seeded buyer: start a list from a listing, tick it
into the first list as well, rename, move, delete the list, remove a listing,
and take a listing out and back in with the heart. The test list was removed
afterwards; the buyer's six saved listings are as they were.

## Filters for manufacturer, model, year and price

* **Hersteller**: several at once; the list shows the eight largest and
  "Alle … anzeigen" for the rest.
* **Modell**: a new group with counts, following the chosen manufacturers.
* **Preis (CHF)** and **Baujahr**: "von" and "bis" fields with the range of
  the current results as hints.
* **Aktive Filter**: chips above the results, each removing its filter.
* On a phone the filters fold behind a "Filter (n)" button, the sort links
  wrap, and nothing in the results column widens the page; on a wide screen
  the filter column scrolls on its own when it is taller than the window.

Tried by hand: two manufacturers with a price and a year range (17
results), then a model (3), the chips and their links, and the folded
filters at tablet width. Unit tests cover the parameters, integration tests
the year, manufacturer, model and range queries.

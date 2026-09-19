# refreshLab – Prototype Execution Plan

Source: ChatGPT session "Design refreshLab marketplace"
(https://chatgpt.com/s/cx_6aaef3896e9c81918501e6e9bec5a693), reviewed 2026-09-19.

Goal of this plan: get a **locally running, working prototype** of the
refreshLab marketplace that uses the target technologies wherever they run
locally, so that designs, flows and behaviours can be tested with real data
and real interactions. The prototype is throw-away at the architecture level
(it will be refactored once requirements are stable) but not at the
learning level: every decision below is chosen so that what we learn carries
over into the production build.

Note: the 20 HTML mockups produced in the ChatGPT session (`refreshlab-20-mockups.html`)
are file attachments and are not reachable through the shared link. Drop the
file into `docs/mockups/` and the design phase (Phase 1) will use it directly.

---

## 1. Requirements review

### 1.1 What the session asked for (original brief)

| # | Requirement | Prototype status |
|---|-------------|------------------|
| R1 | Search | In scope (Postgres full-text + trigram + facets) |
| R2 | Start page | In scope |
| R3 | Lab equipment database (descriptions, pictures, price, metadata) | In scope, incl. model ↔ listing split |
| R4 | Registration + logged-in area | In scope (Supabase Auth, local) |
| R5 | Pay and receive money | In scope as flow; Stripe Connect **test mode** + fake provider |
| R6 | Public comments on equipment objects | In scope |
| R7 | Private messages between registered users | In scope |
| R8 | SEO + AI-crawler optimisation | In scope (SSR, JSON-LD, sitemap, robots) |
| R9 | Admin login: modify/delete all user objects, manage accounts, static content | In scope |
| R10 | Design language: lab/medicine/chemistry/academia, clean, usable, humorous, green | In scope via design tokens + theme variants |
| R11 | Scale to 10 000 active users | Architecture supports it; not exercised locally |
| R12 | Managed hosting, DDoS, LB | Out of scope for the prototype |
| R13 | Clean CI/CD + local dev | Local dev in scope; CI reduced to lint/type/test scripts |

### 1.2 What the session added that the prototype should keep

* **Equipment model vs. listing separation** (Reverb/StockX pattern). This is
  the single most important data-model decision and must be in the prototype,
  otherwise search, comments and price history cannot be tested realistically.
* **Offer → accept → pay → deliver → payout** transaction flow with delayed
  seller payout. The states must exist even if the money is fake.
* **Condition grading** distinguishing seller declarations from verified
  findings (inspection). Prototype: seller declaration + a `verified` flag
  set by admin; full inspection entity later.
* **Organisations** (labs, universities, dealers). Cheap to add now, expensive
  to retrofit, and it changes the UI (who is the seller?).
* **Moderation**: reports on listings/comments/messages, soft delete, audit log.
* **Trust signals** on listing cards (verified seller, condition grade, location).
* **Content pages** (FAQ, guides, legal) editable by admin.

### 1.3 Gaps and questions the session did not settle

These influence the prototype and are flagged with a chosen default:

| Topic | Default assumed for the prototype | Why it matters |
|-------|-----------------------------------|----------------|
| Language | UI in **German and English** from day one (next-intl), content seeded in DE | The session switched to German; Swiss target market. i18n is very hard to retrofit into a design. |
| Currency | CHF primary, EUR allowed per listing | Swiss/EU market, Stripe CHF caveat noted in the session |
| Who can sell | Individuals and organisations | Both flows must be testable |
| Sale modes | Fixed price and "make an offer". **No auctions** in the prototype | Auctions were explicitly deferred to post-launch |
| Comments target | Comments on **equipment models** (knowledge) and on **listings** (Q&A about this unit) | Both were mentioned; separating them is what the Bring-a-Trailer example shows |
| Payout timing | Payout released by buyer confirming receipt, or admin override | Stripe is not an escrow; the flow still has to feel like one |
| Payment method | Card in Stripe test mode; bank transfer simulated | CHF bank transfer via Stripe is unverified |
| Admin roles | Single `admin` role in the prototype; granular roles later | Requirement R9 needs one role only |

### 1.4 Explicitly out of the prototype

Auctions, inspections as a workflow, refurbishment vendor marketplace,
logistics quotes, lifecycle/inventory SaaS, market-intelligence products,
manufacturer participation, MFA, KYC document collection, virus scanning,
rate limiting, multi-region, monitoring stack, CI/CD to Vercel, Sanity CMS,
Algolia, Resend/Postmark, Sentry.

---

## 2. Architecture review and prototype decisions

The proposed production stack was: Next.js + TypeScript + Tailwind, Supabase
(Postgres, Auth, Storage, Realtime), Algolia, Stripe Connect, Sanity, Vercel,
Resend, Sentry, GitHub Actions, TypeScript monorepo with a separate worker.

Assessment: sound for a 10k-user marketplace, no microservices, Postgres as
source of truth. Two things I would change even for production, and several
I substitute only because they cannot run locally.

| Component | Production proposal | Prototype decision | Rationale |
|-----------|--------------------|--------------------|-----------|
| Web framework | Next.js (App Router) | **Next.js 16, App Router, TypeScript** | Target tech, runs locally |
| Styling | Tailwind + custom components | **Tailwind v4 + shadcn/ui-style components + CSS design tokens** | Target tech; tokens allow theme experiments |
| Database | Supabase managed Postgres | **Supabase CLI local stack (Docker): Postgres 15/16** | Target tech, identical engine |
| Auth | Supabase Auth | **Supabase Auth, local** (email+password, magic link) | Target tech; emails land in local Mailpit |
| Files | Supabase Storage | **Supabase Storage, local** | Target tech |
| Realtime messages | Supabase Realtime | **Polling first, Supabase Realtime in Phase 4 if time** | Realtime is available locally but polling is enough to test the UX |
| Search | Algolia | **Postgres FTS + `pg_trgm` + `unaccent`, facets via SQL**, behind a `SearchProvider` interface | Algolia is hosted only. Postgres gives typo-tolerant, faceted search good enough to test behaviour. Typesense in Docker is the fallback if ranking quality blocks design tests. |
| Payments | Stripe Connect | **`PaymentProvider` interface with `FakeProvider` (default) and `StripeProvider` (test mode, Stripe CLI webhooks)** | Stripe test mode runs against localhost; fake provider keeps the app runnable without keys |
| CMS | Sanity for editorial content | **`content_pages` table (Markdown) edited in admin** | Fulfils R9 directly; Sanity adds a hosted dependency for no prototype value. Worth re-evaluating for production too. |
| Email | Resend/Postmark | **Mailpit** (bundled with Supabase local) | Local only |
| Background jobs / worker | Separate worker app + outbox | **In-process: Postgres outbox table + `pg-boss` or a simple cron route** | One process is enough to test behaviour; the outbox pattern is kept so the search index / notifications stay decoupled |
| ORM / migrations | not specified | **Drizzle ORM + drizzle-kit SQL migrations** | Type-safe, plain SQL migrations that port to Supabase migrations unchanged |
| Data access | Supabase client + RLS implied | **Server-side only (Server Components, Server Actions, Route Handlers) via Drizzle with the service connection; RLS deferred** | Halves the prototype effort. Authorisation lives in one server-side module that can later be mirrored into RLS policies. |
| Repo layout | Monorepo (apps/web, apps/worker, packages/*) | **Single Next.js app** with `src/` folders named after the future packages (`domain`, `db`, `integrations`, `ui`) | No tooling overhead; refactor to workspaces later is mechanical |
| Hosting/CI | Vercel + GitHub Actions | **Not built**; `npm run check` (lint, typecheck, unit, e2e) | Per brief |
| Monitoring | Sentry | **Not built**; structured console logs | Per brief |

Two production-relevant observations from the review:

1. **Sanity is probably unnecessary in v1.** Admin-editable Markdown pages
   cover FAQ, guides and legal texts. Revisit only if a non-technical editor
   needs visual editing.
2. **RLS vs. server-side authorisation** has to be decided before production.
   The prototype uses server-side authorisation only; if the production build
   wants browser-side Supabase access, the policies must be written then.

---

## 3. Prototype architecture

```
refreshlab/
  docs/                       this plan, mockups, decisions
  supabase/                   config.toml, seed.sql (auth users), local stack
  drizzle/                    generated SQL migrations
  src/
    app/                      Next.js App Router
      [locale]/
        (public)/             home, search, models, listings, manufacturers, categories, pages
        (account)/            dashboard, my listings, messages, offers, orders, settings
        (admin)/admin/        users, listings, models, comments, reports, pages, audit
        api/                  route handlers: webhooks, search, sitemap, robots, feeds
    domain/                   business rules (listing lifecycle, offers, orders, fees, permissions)
    db/                       drizzle schema, client, queries, seed
    integrations/
      search/                 SearchProvider: postgres (default), typesense (optional)
      payments/               PaymentProvider: fake (default), stripe
      storage/                image upload helpers (Supabase Storage)
      email/                  mail helper (Mailpit via SMTP)
    ui/                       design tokens, components, theme variants, "/design" gallery
    i18n/                     messages/de.json, messages/en.json
  tests/
    unit/                     vitest
    e2e/                      playwright
  docker-compose.yml          optional extras (typesense) – Supabase CLI runs the core stack
```

Runtime on a dev machine:

| Service | How | Port |
|---------|-----|------|
| Postgres | `npx supabase start` | 54322 |
| Supabase API/Auth/Storage | same | 54321 |
| Supabase Studio | same | 54323 |
| Mailpit (auth + app mail) | same | 54324 |
| Next.js | `npm run dev` | 3000 |
| Stripe webhooks (optional) | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` | – |
| Typesense (optional) | `docker compose up typesense` | 8108 |

Local machine check (2026-09-19): Node 26.5 and Docker 29.7 are installed,
Docker Desktop is not running, `psql` exists (Postgres 12 client, fine),
pnpm/corepack absent → use **npm**. Supabase CLI is used via `npx supabase`.

---

## 4. Data model (prototype scope)

All tables carry `id uuid`, `created_at`, `updated_at`; user-content tables
also carry `deleted_at` (soft delete) and `deleted_by`.

**Identity**
* `profiles` (1:1 with `auth.users`): display_name, role (`user`|`admin`), locale, avatar_url, verified_at, suspended_at
* `organisations`: name, type (`lab`|`university`|`company`|`dealer`|`service_provider`), country, city, verified_at
* `organisation_members`: organisation_id, profile_id, role (`owner`|`member`)

**Catalogue (knowledge base)**
* `manufacturers`: name, slug, country, website
* `categories`: parent_id, name (i18n JSONB), slug, spec_schema JSONB (which spec keys this category has)
* `equipment_models`: manufacturer_id, category_id, name, slug, description (i18n), specs JSONB, discontinued, successor_model_id, image_url

**Marketplace**
* `listings`: seller_profile_id, seller_org_id (nullable), model_id, title, description, condition (`new`|`like_new`|`good`|`fair`|`for_parts`), condition_notes, year, serial_hash, price_cents, currency, sale_mode (`fixed`|`offer`|`both`), quantity, location_country, location_city, status (`draft`|`pending_review`|`active`|`reserved`|`sold`|`withdrawn`), verified_at, featured_until, published_at, search_vector tsvector (generated)
* `listing_images`: listing_id, storage_path, alt, sort_order
* `listing_attachments`: listing_id, storage_path, kind (`manual`|`certificate`|`service_report`|`other`)
* `watchlist`: profile_id, listing_id
* `saved_searches`: profile_id, query JSONB, name

**Community**
* `comments`: author_id, target_type (`model`|`listing`), target_id, parent_id, body, status (`visible`|`hidden`)
* `conversations`: listing_id (nullable), created_by
* `conversation_participants`: conversation_id, profile_id, last_read_at
* `messages`: conversation_id, sender_id, body, attachments JSONB
* `blocks`: blocker_id, blocked_id

**Transactions**
* `offers`: listing_id, buyer_id, seller_id, amount_cents, currency, message, status (`open`|`countered`|`accepted`|`rejected`|`expired`|`withdrawn`), parent_offer_id, expires_at
* `orders`: listing_id, buyer_id, seller_id, offer_id (nullable), amount_cents, fee_cents, currency, status (`pending_payment`|`paid`|`shipped`|`delivered`|`completed`|`cancelled`|`disputed`|`refunded`), payment_provider, provider_ref, paid_at, delivered_at, payout_released_at
* `payment_events`: order_id, provider, type, payload JSONB, idempotency_key (unique)
* `seller_accounts`: profile_id or org_id, provider, provider_account_id, onboarding_status

**Operations**
* `reports`: reporter_id, target_type (`listing`|`comment`|`message`|`user`), target_id, reason, status, resolved_by
* `audit_log`: actor_id, action, target_type, target_id, before JSONB, after JSONB
* `content_pages`: slug, title (i18n), body_markdown (i18n), published
* `outbox`: topic, payload JSONB, processed_at (drives search re-index and notifications)

Fee rule seeded in `domain/fees.ts`: 1 % of the sale price, capped at CHF 500
(the example from the session), configurable in one place so alternatives can
be tested.

---

## 5. Execution plan

Each phase ends in a runnable state with a demo script. Estimates assume one
developer working with an AI coding agent; adjust for team size. Phases are
ordered so that the most design-relevant surfaces (catalogue, search, listing
pages) exist first.

### Phase 0 – Foundation (1–2 days)

Deliverable: empty app boots against the local Supabase stack with seed data,
i18n and design tokens in place.

1. `npx create-next-app@latest` (TypeScript, App Router, Tailwind, ESLint, `src/`).
2. `npx supabase init && npx supabase start`; commit `supabase/config.toml`.
3. Drizzle: schema files per domain area, `drizzle-kit generate`, `npm run db:migrate`, `npm run db:reset` (supabase db reset → migrate → seed).
4. Seed script (`src/db/seed.ts`): 12 categories, 15 manufacturers, ~60 equipment models with realistic specs (centrifuges, HPLC, microscopes, balances, pipettes, incubators, thermocyclers, spectrophotometers, ULT freezers, autoclaves, fume hoods, shakers), ~150 listings across conditions/prices/locations, 20 users (2 admins, 3 organisations), comments, conversations, offers, orders in each state, content pages. Placeholder images generated as SVG per category.
5. `next-intl` with `[locale]` routing, DE default, EN second; message files started.
6. Design tokens in `src/ui/tokens.css` (colour, spacing, radius, type scale; light + dark; a `data-theme` attribute for variants). Base components: Button, Input, Select, Badge, Card, Dialog, Tabs, Table, Toast, EmptyState.
7. `/design` route: component gallery with theme switcher (used throughout to test design directions).
8. Scripts: `dev`, `check` (lint + tsc + vitest), `db:*`, `e2e`. Vitest + Playwright installed with one smoke test each.
9. `README.md`: 5-command local setup.

Acceptance: fresh clone → `npm i && npx supabase start && npm run db:reset && npm run dev` shows the home page with seeded content in DE and EN.

### Phase 1 – Public catalogue and search (3–4 days)

Deliverable: the whole public, logged-out experience, server-rendered and
crawlable.

1. Home page: search bar, category tiles, featured/latest listings, trust strip, humorous copy slots.
2. Category pages (hierarchical), manufacturer pages, equipment model pages (specs table, listings for this model, comments placeholder, price range from active + sold listings).
3. Listing detail page: gallery, price/currency, condition grade with notes, seller card (profile or organisation, verified badge), location, "Buy now / Make an offer / Ask a question" CTAs (disabled until Phase 2/4), related listings.
4. Search: `SearchProvider` interface; Postgres implementation with `tsvector` (title, model, manufacturer, description), `pg_trgm` similarity for typo tolerance, exact-match boost for catalogue numbers, facets (category, manufacturer, condition, country, price range, sale mode, verified), sort (relevance, price, newest). Results page with URL-synced filters, pagination, empty state.
5. Outbox consumer that refreshes derived search fields on listing change (keeps the indexing seam for Algolia/Typesense).
6. SEO: metadata per page, canonical URLs, Open Graph, `Product`/`Offer`/`Organization`/`BreadcrumbList` JSON-LD in initial HTML, `sitemap.xml` index (models, listings, categories, manufacturers), `robots.txt` with explicit crawler policy, alt text from data.
7. Public JSON feed `/api/feed/listings` (paged) as the documented catalogue feed for AI/agents.
8. Playwright: search → filter → open listing; JSON-LD present in HTML.

Acceptance: `curl` of a listing page returns price, condition and JSON-LD without JavaScript; Lighthouse SEO ≥ 90 locally.

### Phase 2 – Accounts, organisations, selling (3–4 days)

Deliverable: registration, login, seller flow end-to-end.

1. Supabase Auth via `@supabase/ssr`: sign-up (email + password), magic link, verification emails visible in Mailpit, password reset. `profiles` row created by DB trigger on `auth.users` insert.
2. Server-side session helper + `requireUser()` / `requireAdmin()` guards; `domain/permissions.ts` as the single authorisation module.
3. Account area: profile settings (name, locale, avatar upload to Supabase Storage), organisation create/join, dashboard overview.
4. Create listing wizard: pick or propose an equipment model (typeahead over models; "model not found" creates a `pending` model for admin review), condition and notes, price/currency/sale mode, location, images (multi-upload, reorder, alt text), attachments, preview, publish. Listing edit, status changes (withdraw, mark reserved/sold), soft delete.
5. Watchlist and saved searches (with "new results" count on dashboard; no email yet).
6. Playwright: register → create listing → appears in search.

Acceptance: a new user can register, publish a listing with images, and see it publicly within one request cycle.

### Phase 3 – Comments and private messages (2 days)

Deliverable: the two community features from the brief, with moderation hooks.

1. Comments on model pages and listing pages: threaded one level, edit/delete own, Markdown-lite, report button. Seller replies are labelled.
2. Conversations: "Ask the seller" from a listing creates/opens a conversation; inbox with unread counts, message thread, attachments via Storage, block user, report. Polling every 5 s; optional upgrade to Supabase Realtime.
3. Email notification stub through Mailpit on new message (via outbox).
4. Anti-abuse minimum: cannot message yourself, blocked users cannot write, simple per-minute cap in `domain/`.

Acceptance: two seeded users exchange messages in two browser sessions; admin sees the report.

### Phase 4 – Offers, orders and payments (3–4 days)

Deliverable: the money flow from the session, testable with fake money and, optionally, real Stripe test mode.

1. Offers: make/counter/accept/reject/withdraw with expiry; seller inbox of offers; accepted offer creates an order and sets the listing to `reserved`.
2. Buy now: creates an order at list price.
3. Orders: state machine in `domain/orders.ts` (pending_payment → paid → shipped → delivered → completed; cancelled/disputed/refunded branches), fee calculation, buyer and seller order pages with timeline, "confirm receipt" releases payout.
4. `PaymentProvider` interface: `createCheckout(order)`, `handleWebhook(event)`, `refund(order)`, `onboardSeller(account)`, `releasePayout(order)`.
   * `FakeProvider`: a local checkout page with "Pay" / "Fail" buttons; simulates bank transfer with an admin "mark as received" action.
   * `StripeProvider`: Stripe Checkout in test mode, Connect Express onboarding link, separate charges and transfers with delayed transfer on payout release, webhooks via Stripe CLI, idempotency via `payment_events.idempotency_key`.
5. Invoices: simple HTML invoice per order (buyer and seller view) with fee lines separated.
6. Dispute: buyer opens dispute → order `disputed`, payout blocked, admin resolves (refund full/partial or release).
7. Unit tests for the state machine and fee rule; Playwright: offer → accept → fake pay → confirm receipt → payout released.

Acceptance: full transaction on FakeProvider without external keys; same flow on Stripe test mode when keys are set.

### Phase 5 – Admin and moderation (2–3 days)

Deliverable: requirement R9 in full.

1. `/admin` guarded by role; navigation: overview KPIs (active listings, users, open reports, orders by state), users, organisations, listings, models, comments, messages (report-driven view only), orders/disputes, reports, content pages, audit log.
2. Users: search, view, edit profile, suspend/unsuspend, verify, promote/demote admin, view a user's listings/comments/orders.
3. Listings/models/comments: edit any, hide/restore (soft delete), approve `pending_review` listings and proposed models, merge duplicate models (re-point listings), feature a listing.
4. Reports queue with resolve actions that write to `audit_log`.
5. Content pages: Markdown editor per locale, publish toggle, rendered at `/[locale]/p/[slug]` and linked in footer (FAQ, About, Terms, Privacy, Guides).
6. Settings: fee rule, categories and spec schemas editable.
7. Every admin mutation goes through `domain/` and records `audit_log` before/after.

Acceptance: admin can find and fix anything a seeded user created; audit log shows it.

### Phase 6 – Test harness and design experiments (2 days, then continuous)

Deliverable: the prototype becomes a lab for requirements.

1. Playwright scenario suite runnable in one command; seeded "personas" (buyer, private seller, dealer org, admin) with fixed credentials in `README`.
2. Feature flags in `src/domain/flags.ts` (e.g. `offersEnabled`, `requireListingReview`, `showPriceHistory`, `commentsOnListings`) switchable via env or admin settings, so alternative behaviours can be compared.
3. Theme variants in `/design` and a `?theme=` override on any page: e.g. "clinical" (white, graphite, restrained green), "field notebook" (warmer, more humour), "dense dealer" (compact tables) – three directions from the session's design brief.
4. Realistic data volume script (`npm run db:seed -- --listings 5000`) to test search and list performance and layouts with long tails.
5. Decision log `docs/decisions.md`: every behaviour tested and the outcome, to feed the production requirements.

### Phase 7 – Optional add-ons (only if a test needs them)

* Typesense in Docker behind `SearchProvider` for Algolia-like ranking/typo behaviour.
* Supabase Realtime for messages and offer updates.
* Price history chart on model pages from `orders`.
* Bulk CSV listing import for dealers.
* Spreadsheet export of orders.

Total for Phases 0–6: roughly 16–21 developer days.

---

## 6. Local development setup (target end state of Phase 0)

```bash
# prerequisites: Node ≥ 20, Docker Desktop running
git clone <repo> refreshlab && cd refreshlab
npm install
npx supabase start          # Postgres, Auth, Storage, Studio, Mailpit
cp .env.example .env.local  # keys printed by `supabase status`
npm run db:reset            # migrate + seed
npm run dev                 # http://localhost:3000
```

Optional:

```bash
stripe login && stripe listen --forward-to localhost:3000/api/webhooks/stripe
docker compose up -d typesense
```

`.env.example` keys: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`PAYMENT_PROVIDER=fake|stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`SEARCH_PROVIDER=postgres|typesense`, `SMTP_URL`.

---

## 7. Testing strategy

| Layer | Tool | What |
|-------|------|------|
| Unit | Vitest | fee rule, order/offer/listing state machines, permissions, search query builder |
| Integration | Vitest against local Postgres | Drizzle queries, search facets, outbox consumer |
| E2E | Playwright | the five journeys: search → listing; register → sell; ask seller → reply; offer → pay → payout; admin moderates |
| Visual | Playwright screenshots of `/design` and key pages per theme | design comparison |
| Manual | Personas + Mailpit + Studio | behaviour exploration |

---

## 8. What is deliberately not carried over to the prototype and why

* **Monorepo / separate worker**: no benefit until there are two deployables.
* **RLS policies**: authorisation is server-side only; documented as a production decision.
* **Algolia, Sanity, Resend, Sentry, Vercel**: hosted; each has a local substitute or is stubbed.
* **MFA, KYC, virus scanning, rate limiting, WAF**: production safeguards with no requirements value in a local prototype.

---

## 9. Open questions to settle during the prototype (from the session's Phase 1 list)

1. Does refreshLab sell itself or only broker? (Prototype: broker only.)
2. Fixed price, offer, or quote request as the primary buying path?
3. Who is liable for shipping, installation and condition?
4. Fee model: 1 % capped at CHF 500 vs. fixed fee vs. subscriptions.
5. Payout trigger: buyer confirmation, delivery evidence, or time-based.
6. Individuals allowed, or organisations only?
7. Countries and currencies at launch.
8. Mandatory listing fields per category.
9. Definition of "refurbished" and "verified".

Each of these maps to a feature flag or a `domain/` rule in the prototype so
the alternatives can be tried rather than argued.

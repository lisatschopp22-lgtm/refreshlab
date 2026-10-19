# refreshLab — local prototype

A working prototype of the refreshLab marketplace for used laboratory
equipment. It runs entirely on a laptop with real Postgres, real auth, real
file storage and real search, so designs and behaviours can be tested with
data rather than mocked up.

See [`docs/build-instructions.md`](docs/build-instructions.md) for what is
being built and [`docs/execution-plan.md`](docs/execution-plan.md) for the
requirements review and architecture decisions.

## Setup

Prerequisites: Node 20+, and a container runtime (Docker Desktop, colima or
OrbStack) that is **running**.

```bash
npm install
npx supabase start        # Postgres, Auth, Storage, Studio, Mailpit
cp .env.example .env.local  # then paste the keys from `npx supabase status`
npm run db:reset          # migrate + seed
npm run dev               # http://localhost:3000
```

| Service | URL |
|---|---|
| Site | http://localhost:3000 |
| Design system | http://localhost:3000/de/design |
| Supabase Studio | http://127.0.0.1:54323 |
| Mailpit (all outgoing mail) | http://127.0.0.1:54324 |

## Sign-in accounts

Every seeded account uses the password `refreshlab`.

| Address | Role |
|---|---|
| `admin@refreshlab.local` | Administrator |
| `moderation@refreshlab.local` | Administrator |
| `anna.buyer@refreshlab.local` | Buyer, has a watchlist, offers and orders |
| `beat.seller@refreshlab.local` | Private seller |
| `dealer@biorefurb.local` | Owner of BioRefurb GmbH (dealer organisation) |
| `lab@lifescience-basel.local` | Owner of LifeScience Basel AG |
| `epfl@refreshlab.local` | Owner of EPFL Bioengineering |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run check` | lint, typecheck, colour guard, unit and integration tests |
| `npm run e2e` | Playwright journeys |
| `npm run db:reset` | Wipe, migrate and re-seed |
| `npm run db:generate` | Generate a migration after a schema change |
| `npm run db:seed -- --listings 5000` | Re-seed with a larger catalogue |
| `npm run images:fetch` | Fetch real equipment photographs (see below) |
| `npm run images:clear` | Remove them and go back to the placeholders |
| `npm run screenshots` | Every key screen in every palette, into `screenshots/` |
| `npm run db:studio` | Drizzle Studio |

## Design: palettes are not decided

The brand colour is an open question, so no component hard-codes a colour.
Everything derives from `--hue` and `--chroma` in
[`src/ui/tokens.css`](src/ui/tokens.css), and `npm run check` fails on any raw
colour outside that file.

Seven dimensions switch at runtime, from the control at the bottom right of
any page or from a query parameter. The panel can also shuffle a combination,
reset it, and copy a link that reproduces exactly what is on screen.

| Dimension | Options |
|---|---|
| `palette` | `botanical`, `moss`, `clinical`, `ocean`, `aqua`, `ember`, `copper`, `crimson`, `plum`, `graphite`, `slate`, `ink` |
| `theme` | warm paper: `cream`, `vanilla`, `linen`, `sand` (default), `greige`, `latte`; `light`, `dark`, `system` (follows the operating system) |
| `font` | `inter`, `plex`, `grotesk` (Space Grotesk headings), `serif` (Source Serif headings), `system` |
| `radius` | `sharp`, `soft`, `round` |
| `depth` | `flat`, `raised`, `lifted` |
| `density` | `compact`, `comfortable`, `roomy` |
| `contrast` | `normal`, `high` |
| `logo` | 20 lockups, see [`/de/design/logo`](http://localhost:3000/de/design/logo) |

```
http://localhost:3000/de/design?palette=plum&font=serif&radius=round&depth=lifted
```

`slate` is a near-neutral and `ink` is monochrome, because "no brand colour"
is a legitimate answer worth seeing. Every option is also listed on
[`/de/design`](http://localhost:3000/de/design) as links, so two directions can
be opened side by side in two tabs.

### Logo

[`/de/design/logo`](http://localhost:3000/de/design/logo) holds twenty
proposals: fourteen marks, four typographic treatments and two reversed tiles
where the colour surrounds the subject instead of forming it. Choosing one puts it in the
header and footer of the whole site, so it is judged where it will sit rather
than on a white page. The marks inherit the active palette and the wordmarks
inherit the active typeface.

## Real photographs instead of placeholders

The seed draws its own technical placeholders, which is enough to judge layout
but not to judge how the site feels. To use real equipment photographs:

```bash
npm run images:fetch          # Wikimedia Commons, searched per category
npm run db:seed -- --images reference
```

Two sources, because they differ in what you may do with the result:

| `--source` | What it is | May it be published? |
|---|---|---|
| `commons` (default) | Wikimedia Commons, searched per equipment category, so a centrifuge listing gets a centrifuge. Licence and author recorded per image. | Yes, with attribution. |
| `labfinder` | Product photographs from labfinder.ch. | **No.** Local comping only. |

Neither is committed: the cache and the manifest are gitignored, and the
generated placeholders stay the default, so a fresh clone never depends on
someone else's pictures. `supabase/reference-images.json` records the source
page, licence and author of every image. `npm run images:clear` removes them.

## Comparing designs

`npm run screenshots` writes 109 images into `screenshots/`: the home and
design pages in all twelve palettes, light and dark; search, listing and
catalogue in four; the account and admin areas; mobile widths; and a
`looks/` folder comparing shape, depth, typeface and density at a fixed
colour. That is the quickest way to put two directions side by side.

## Open questions and flags

Behaviours that are still undecided sit behind flags so alternatives can be
compared rather than argued about. Change them in **Admin → Settings**
(`/de/admin/einstellungen`), or override any of them with an environment
variable, which always wins.

| Flag | Environment variable | What it decides |
|---|---|---|
| `offersEnabled` | `FLAG_OFFERS` | Whether buyers can negotiate at all |
| `buyNowEnabled` | `FLAG_BUY_NOW` | Whether a fixed-price purchase skips negotiation |
| `requireListingReview` | `FLAG_LISTING_REVIEW` | Whether new listings need approval before going public |
| `commentsOnListings` | `FLAG_LISTING_COMMENTS` | Public Q&A on a unit, as well as on the model |
| `showPriceRangeOnModel` | `FLAG_PRICE_RANGE` | Whether the market price range is shown |
| `buyerConfirmsReceipt` | `FLAG_BUYER_CONFIRMS` | Whether the buyer or an admin releases the payout |
| `showDesignSwitcher` | `FLAG_DESIGN_SWITCHER` | The prototype-only palette control |

The fee rule is editable in the same screen, with a table showing what the
current setting means for sales from CHF 500 to CHF 500,000.

Decisions taken while building are logged in
[`docs/decisions.md`](docs/decisions.md), and what each phase delivered is in
[`docs/progress.md`](docs/progress.md).

## Notes

* Payments are simulated by default (`PAYMENT_PROVIDER=fake`). No money moves.
  Set `PAYMENT_PROVIDER=stripe` with a test-mode key to use Stripe Connect, and
  forward webhooks with `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
* All outgoing mail lands in Mailpit at http://127.0.0.1:54324.
* `npm run e2e` re-seeds the database first, because the journeys buy and sell
  real rows. Use `E2E_SKIP_SEED=1` to keep your own data while iterating.
* Search runs on Postgres full-text plus trigram typo tolerance, behind a
  `SearchProvider` interface so Algolia or Typesense can replace it later.
  `SEARCH_DEBUG=1` logs how long each part of a search takes. Measured in a
  production build with 5,000 listings: home 55 ms, faceted search 40 ms,
  text search 180 ms.
* All data access is server-side through Drizzle. There is no row-level
  security in the prototype; authorisation lives in `src/domain/permissions.ts`.

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
| `npm run db:studio` | Drizzle Studio |

## Design: palettes are not decided

The brand colour is an open question, so no component hard-codes a colour.
Everything derives from `--hue` and `--chroma` in
[`src/ui/tokens.css`](src/ui/tokens.css), and `npm run check` fails on any raw
colour outside that file.

Four palettes ship: `botanical` (green, as in the first mockups), `clinical`
(blue), `ember` (amber) and `graphite` (violet-grey). Switch them with the
control at the bottom right of any page, or with a query parameter:

```
http://localhost:3000/de/design?palette=ember&theme=dark&density=compact
```

Appearance (`light`/`dark`/`system`), typeface (Inter or IBM Plex Sans) and
density are switchable the same way.

## Open questions and flags

Behaviours that are still undecided sit behind flags in
[`src/domain/flags.ts`](src/domain/flags.ts) so alternatives can be compared
rather than argued about: `offersEnabled`, `buyNowEnabled`,
`requireListingReview`, `commentsOnListings`, `showPriceRangeOnModel`,
`buyerConfirmsReceipt`, `showDesignSwitcher`.

Decisions taken while building are logged in
[`docs/decisions.md`](docs/decisions.md).

## Notes

* Payments are simulated by default (`PAYMENT_PROVIDER=fake`). No money moves.
* Search runs on Postgres full-text plus trigram typo tolerance, behind a
  `SearchProvider` interface so Algolia or Typesense can replace it later.
* All data access is server-side through Drizzle. There is no row-level
  security in the prototype; authorisation lives in `src/domain/permissions.ts`.

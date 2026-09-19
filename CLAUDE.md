# refreshLab – project conventions

refreshLab is a marketplace for used laboratory equipment (Swiss market, DE/EN).
This repository holds the **local working prototype**. It exists to test
designs, flows and behaviours with real data; it will be refactored once
requirements are stable. Nothing here targets hosting, CI/CD or monitoring.

Read before working:
- `docs/build-instructions.md` – what to build, in which order, and the rules
- `docs/execution-plan.md` – requirements review, architecture decisions, data model, phases
- `docs/mockups/refreshlab-20-mockups.html` – 20 design mockups (open in a browser)

## Stack (fixed)
Next.js 16 App Router + TypeScript (strict) · Tailwind v4 · Supabase CLI local
stack (Postgres, Auth, Storage, Mailpit) · Drizzle ORM + drizzle-kit SQL
migrations · next-intl (de default, en) · Vitest · Playwright · npm (no pnpm).

## Commands
```
npx supabase start        # local Postgres/Auth/Storage/Studio/Mailpit
npm run dev               # http://localhost:3000
npm run db:reset          # supabase db reset → drizzle migrate → seed
npm run db:generate       # drizzle-kit generate after schema changes
npm run check             # lint + tsc + vitest (must pass before every commit)
npm run e2e               # playwright
```

## Rules
- All data access is server-side (Server Components, Server Actions, Route
  Handlers) through Drizzle. No browser-side Supabase data queries. No RLS yet.
- Authorisation lives only in `src/domain/permissions.ts`. Every mutation goes
  through a `src/domain/*` function; UI never writes to the DB directly.
- Admin mutations write `audit_log` (before/after) in the same transaction.
- User content is soft-deleted (`deleted_at`), never hard-deleted.
- Colours only via CSS tokens in `src/ui/tokens.css`. Never hard-code a colour
  in a component or a Tailwind class like `bg-green-600`. The brand hue is not
  decided; palettes are switchable at runtime (`data-palette`).
- Every user-facing string goes through next-intl (`messages/de.json`,
  `messages/en.json`). German is the source language.
- Public pages must render their content in the initial HTML (no client-only
  data fetching for catalogue pages).
- External services are behind interfaces in `src/integrations/*` with a
  local/fake default (`SearchProvider`, `PaymentProvider`, `Mailer`).
- Feature toggles in `src/domain/flags.ts`; new behaviours that are still an
  open question get a flag, not a hard decision.
- Prices are integer cents + ISO currency. Money math only in `src/domain/money.ts`.
- Commit at the end of every phase with a message `phase N: <summary>`.

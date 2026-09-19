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

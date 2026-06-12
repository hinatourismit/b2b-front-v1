# Gaps & Open Questions

> Phase 1 deliverable — things that are unclear or missing and need confirmation before/during implementation.

## Decisions (answered 2026-06-12)

| # | Question | Decision |
| --- | --- | --- |
| 3 | Dashboard | **Both** — build a real dashboard at `/dashboard`, but keep hotel search as the default landing page (`/`). |
| 4 | Standalone transfers | **Defer to a later phase** — plan for it in the architecture, build after feature parity. |
| 7 | Payment gateways | **CCAvenue only** is active — build it first; stub the others behind the payment abstraction. |
| 1 | API server URL | **Resolved** — old `constants.js` provided (see `04-environment-config.md`). Production API: `https://api-server-i1.mytravellerschoice.com`. New app reads it from `VITE_API_URL`. Still need a test/local backend URL for development. |
| 3b | Landing page | **Updated 2026-06-12:** Attractions home is the landing page at `/` (supersedes "hotel search stays at /"). Hotels placeholder at `/hotel`; revisit the hotel home path when Phase B1 lands. Module fallback priority now: attractions → hotels → visas → a2a → quotations → insurance. |
| — | Flights | **Deferred** (decided 2026-06-12) — not currently operated. Skip the Flight module entirely in the initial build; plan for it as a later phase. The `showFlight` config flag and module-fallback redirect order must still be handled (flag off → module hidden). A2A (fixed air tickets) is a separate module and remains in scope unless stated otherwise. |

## Missing artifacts

1. **`src/constants.js` is absent** from `/b2b-front-main` (gitignored). It defines `config.SERVER_URL` (switched by `VITE_NODE_ENV`: `PROD_LIVE` / `TEST_LOCAL` / `TEST_LIVE`). → Need the real server URLs (or at least the local/dev one) to run the new frontend against the backend.
2. **Backend `.env`** — only `.env.example` / `.env.production` exist in the repo copy; confirm a runnable local backend (MongoDB + Redis + JWT_SECRET) is available for integration testing.

## Behavioral questions

3. **Dashboard**: `Dashboard.jsx` exists but is unrouted; the de-facto home is hotel search. The rebuild plan calls for a dashboard — confirm whether the new app should add a real dashboard (new UX) or keep hotel-search-as-home (strict parity).
4. **Transfers**: backend transfer search/order endpoints are live, but the standalone transfer pages are commented out in the router (transfers only appear inside quotations and the unified cart). Should the new app expose standalone Transfer booking pages, or match current behavior?
5. **Tour packages**: B2B endpoints exist (`/tour-packages`, enquiries) but no frontend pages were found using them. In or out of scope?
6. **Unified orders cart** (`/orders/create` spanning attractions + transfers) vs the attraction-only flow — confirm which checkout path(s) production actually uses (both exist in code).
7. **Payment gateways**: CCAvenue, PayPal, Razorpay, Tabby all appear. Confirm which are active in production so the new checkout doesn't build dead integrations first.
8. **Sub-agent experience**: role checks are scattered in components; there is no consolidated spec of what a `sub-agent` role can/can't see. Will document precisely during module implementation; flag anything ambiguous.
9. **Backend typos are contract**: `showQuotaion`, `/quotations/inital`, `/list-categroy`, `eligibilty`, `update/profileSetings` — the new frontend must use these exact strings. Listed here so nobody "fixes" them.
10. **Insurance** module depends on an external contract provider; no sandbox details known.

## Out of scope (confirmed by code, not building)

- B2C site (`/api/v1/*` public routes), Admin panel, Admin-B2B portal.
- Partner API (`/attraction-api`, `/api/hotels/*`, API-key auth).

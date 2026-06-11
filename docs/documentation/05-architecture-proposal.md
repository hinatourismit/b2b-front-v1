# Phase 2 — Architecture Proposal for `b2b-hina-tourism`

> Status: **proposed — awaiting approval**. No implementation code yet.
> Inputs: docs 01–04 (Phase 1 analysis) and decisions in doc 03.

## 1. Scope of the initial build

In: Auth (incl. sub-agent management & verification), Dashboard (new), Hotels, Attractions, Visas, A2A, Quotations, Insurance, Wallet/Transactions, Markups, Unified Orders, Settings/static content.
Deferred: **Flights** (not operated), **standalone Transfers**, payment gateways other than **CCAvenue**, Tour Packages (pending decision).
Both deferred modules get reserved domain folders so adding them later is additive.

## 2. Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | React 18 + TypeScript + Vite | strict TS; path alias `@/` |
| Routing | React Router v6 (data-less, route objects) | mirrors old route tree |
| Server state | TanStack Query v5 | replaces ~13 of the old Redux slices |
| Client state | **Zustand** (small deviation from the CLAUDE.md list) | only for: auth session, quotation builder, multi-step checkout. Rationale: these are genuinely client-side multi-step states; Zustand gives Redux-like devtools with ~0 boilerplate. Alternative if rejected: React Context + useReducer. |
| HTTP | Axios (single instance + interceptors) | |
| UI | Tailwind CSS + shadcn/ui (Radix) | design tokens for future Hina branding |
| Forms | React Hook Form + Zod | Zod schemas double as request typing |
| Dates | `date-fns` (replaces moment) | moment is deprecated/heavy |
| Icons | `lucide-react` (shadcn default) | |
| Quality | ESLint + Prettier + Vitest + React Testing Library | tests focused on api layer + critical flows |

## 3. Folder structure (by domain)

```
b2b-hina-tourism/
├── docs/
├── public/
├── .env.example                  # VITE_API_URL, VITE_CLIENT_URL, VITE_GOOGLE_MAPS_API_KEY
└── src/
    ├── app/                      # application shell
    │   ├── App.tsx
    │   ├── providers.tsx         # QueryClient, Router, Toaster, ErrorBoundary
    │   ├── router.tsx            # assembles routes from feature modules
    │   └── layouts/
    │       ├── MainLayout.tsx    # header, module nav, footer
    │       └── AuthLayout.tsx    # login/register/verification
    ├── config/
    │   ├── env.ts                # zod-validated import.meta.env access
    │   ├── branding.ts           # ALL company values (name, logo, contacts…) — single swap point for Hina branding
    │   └── modules.ts            # MODULE REGISTRY (see §5)
    ├── lib/
    │   ├── api-client.ts         # axios instance + auth/401 interceptors
    │   ├── query-client.ts
    │   ├── download.ts           # PDF/Excel download helper (authed blob + open)
    │   └── utils.ts              # cn(), formatters (price, date, time)
    ├── components/
    │   ├── ui/                   # shadcn/ui primitives
    │   └── common/               # DataTable, PageHeader, EmptyState, StatusChip,
    │                             # SearchCombobox, DateRangePicker, PaxSelector,
    │                             # PriceSummaryCard, FileUpload, ConfirmDialog…
    ├── features/                 # ── one folder per business domain ──
    │   ├── auth/                 # login, register, verification, profile, password
    │   │   ├── api/              #   auth.api.ts (endpoint fns) + auth.queries.ts (TQ hooks)
    │   │   ├── components/
    │   │   ├── pages/
    │   │   ├── store/            #   auth.store.ts (Zustand: token, agent, module flags)
    │   │   ├── types/
    │   │   └── routes.tsx        #   exports this feature's RouteObject[]
    │   ├── dashboard/
    │   ├── hotels/
    │   ├── attractions/
    │   ├── visas/
    │   ├── a2a/
    │   ├── quotations/           # incl. builder store + amendments
    │   ├── insurance/
    │   ├── orders/               # unified orders list/detail
    │   ├── wallet/               # balance, deposits, withdrawals, transactions
    │   ├── markup/               # client + sub-agent markup mgmt (all products)
    │   ├── agents/               # sub-agent CRUD + module access config
    │   ├── payments/             # gateway abstraction (CCAvenue now; others stubbed)
    │   ├── settings/             # profile, T&C, privacy, contact
    │   ├── transfers/            # ← reserved (deferred)
    │   └── flights/              # ← reserved (deferred)
    └── types/                    # cross-domain shared types (ApiError, Pagination…)
```

Conventions:
- Every feature has the same internal shape (`api/ components/ pages/ types/ routes.tsx`, optional `store/`).
- **UI components never import axios** — only the feature's query hooks. Query hooks only call the feature's `*.api.ts`. This is the centralized-API rule from CLAUDE.md, enforced by an ESLint `no-restricted-imports` rule.
- Cross-feature imports only via a feature's public `index.ts`.

## 4. API layer & microservice readiness

```
lib/api-client.ts
  baseURL = `${env.VITE_API_URL}/api/v1`
  request interceptor  → attach `Authorization: Bearer <token>` from auth store
  response interceptor → 401 → clear session → redirect /login
```

- Each feature's `api/*.api.ts` declares a **domain base path constant**, e.g.
  `const BASE = "/b2b/hotels"` — endpoint functions build on it. When the backend
  later splits into services, repointing a domain = changing one constant (or an
  env override `VITE_API_URL_HOTELS`), zero component changes.
- Backend contract is used **verbatim**, including known typos
  (`/quotations/inital`, `showQuotaion`, `/list-categroy`, `eligibilty`,
  `update/profileSetings`) — documented in `01-backend-analysis.md`.
- Response types are written from observed responses; unknown fields typed as
  optional. **No invented contracts.** Error shape: `{ error: string, status: number }`.
- File downloads (vouchers, invoices, tickets, Excel sheets) via a shared
  `download.ts` helper (handles both authed blob fetches and the deliberately
  unauthenticated PDF links).

## 5. Auth & module gating

- Token stored in `localStorage` (new key: `hina-agent-token`), session bootstrapped
  on load via `GET /b2b/resellers/auth/getReseller` (same flow as old app, incl. the
  pending-agent branch → `/verification/:agentCode/:randomString`).
- **Module registry** (`config/modules.ts`) replaces the old app's 7 duplicated
  guard files. One declarative table:

  | key | config flag | nav | home route | fallback priority |
  | --- | --- | --- | --- | --- |
  | hotels | `showHotel` | ✓ | `/` | 1 |
  | attractions | `showAttraction` | ✓ | `/attraction` | 2 |
  | visas | `showVisa` | ✓ | `/visa` | 3 |
  | a2a | `showA2a` | ✓ | `/a2a` | 4 |
  | quotations | `showQuotaion` *(sic)* | ✓ | `/quotation` | 5 |
  | insurance | `showInsurance` | ✓ | `/insurance` | 6 |
  | flights | `showFlight` | deferred — registered but disabled | — | — |

- Guards: `<ProtectedRoute>` (logged in + ≥1 module enabled, else `/entrydenied`)
  and `<ModuleGuard module="hotels">` (flag off → redirect to highest-priority
  enabled module). Same behavior as today, one implementation.
- Role handling: `useAgent()` exposes `isReseller` / `isSubAgent`; agent-management
  and markup routes wrapped in `<ResellerOnly>`.

## 6. Routing strategy

- **All existing URL paths are preserved** — critical because CCAvenue return
  URLs and emailed links point at fixed paths on `CLIENT_URL`
  (`/b2b/wallet/deposit/:id/success`, `/payment-decline`, invoice pages, etc.).
  The new app must be a drop-in at the same domain.
- Additions: `/dashboard` (new). `/` remains hotel search (per decision).
- Each feature exports its own `routes.tsx`; `app/router.tsx` composes them —
  the router never knows page internals.
- Route-level code splitting (`React.lazy`) per feature.

## 7. Design system (Hina Tourism)

Inspiration: Klook (search-first, card browsing) and Rayna (B2B density) — not copied.

- **Tokens** in Tailwind theme + CSS variables: brand primary/secondary, surface,
  semantic (success/warning/destructive), radius, shadows. Actual Hina palette
  pending brand assets (placeholder: deep teal `#0F766E` + warm amber accent,
  easily swapped via tokens).
- Typography: Plus Jakarta Sans (display) + Inter (body).
- Layout: sticky top header — logo, module nav (registry-driven), wallet-balance
  chip, agent menu. No admin sidebar; content pages are full-width with a
  max-w container. Mobile: bottom-sheet nav.
- Patterns: hero search panels per product, card grids with price-from + trust
  badges, stepper checkout with sticky price-summary rail, status-chip-driven
  order tables (DataTable with server pagination + Excel export button),
  skeleton loading everywhere, empty/error states with illustrations.
- Accessibility: Radix primitives, focus-visible, AA contrast.

## 8. Cross-cutting concerns

- **Payments abstraction** (`features/payments`): `PaymentMethod` interface with
  `wallet`, `ccavenue` (+ `paylater` for hotels) implementations now; tabby/paypal/
  razorpay stubs behind it. CCAvenue flow = backend-driven redirect; result pages
  at the preserved callback routes.
- **Wallet balance**: one `useBalance()` query, invalidated after every payment/
  deposit; surfaced in header and checkout.
- **Validation**: Zod schemas per form, mirroring backend Joi rules where visible;
  server errors surfaced via toast + field mapping.
- **Error handling**: global QueryCache error handler → toast; per-page error
  boundaries; 401 handled centrally.
- **i18n/currency**: prices displayed via a single `formatPrice` util (AED default),
  ready for multi-currency later.

## 9. Implementation phases (preview — detailed page plan is Phase 3)

| Phase | Contents |
| --- | --- |
| A — Foundation | scaffold, env/branding/config, api-client, auth (login/register/verification/forgot), layouts, module registry & guards, shared components, dashboard shell |
| B — Core products | Hotels → Attractions → Visas → A2A |
| C — Operations | Quotations (builder, list, amendments, confirm), unified Orders, Insurance |
| D — Finance | Wallet, deposits/withdrawals, transactions, markups, sub-agents |
| E — Finalization | Settings/static pages, dashboard data, notifications, performance & UX polish |

Deferred backlog: Flights, standalone Transfers, PayPal/Razorpay/Tabby, Tour Packages.

## 10. Risks / open items

- Old test/local backend URL unknown — until provided, development hits production API (risky) or a locally run `api-server-main`.
- Hina branding assets pending (placeholders via `config/branding.ts`).
- Response typings must be confirmed screen-by-screen during implementation (no backend docs exist).

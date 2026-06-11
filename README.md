# Hina Tourism — B2B Portal (frontend)

Modern rebuild of the B2B agent portal. Consumes the existing backend at
`/api/v1/b2b/**` — API contracts are used verbatim and must never be changed
from this repo.

## Stack

React 19 · TypeScript · Vite · React Router 7 · TanStack Query 5 · Zustand ·
Axios · Tailwind CSS 4 · shadcn/ui · React Hook Form · Zod · date-fns

## Getting started

```bash
cp .env.example .env   # fill in VITE_API_URL
npm install
npm run dev            # http://localhost:3000
```

## Architecture

- `src/features/<domain>/` — one folder per business domain (`auth`, `hotels`,
  `attractions`, `visas`, `a2a`, `quotations`, `insurance`, `wallet`, …), each
  with `api/` (endpoint fns + TanStack Query hooks), `components/`, `pages/`,
  `types/`.
- `src/config/` — `env.ts` (validated env), `branding.ts` (all company values —
  single swap point), `modules.ts` (module registry: per-agent feature flags,
  nav, fallback priority).
- `src/lib/api-client.ts` — the only axios instance. UI components never call
  endpoints directly; they use feature query hooks.
- URL paths mirror the old portal exactly — payment-gateway return URLs depend
  on them.

Full documentation lives in `docs/documentation/`:

| Doc | Contents |
| --- | --- |
| 01 | Backend analysis + complete B2B endpoint inventory |
| 02 | Old frontend analysis (routes, auth, workflows) |
| 03 | Decisions & open questions |
| 04 | Environment & branding values |
| 05 | Architecture proposal |
| 06 | Page-by-page rebuild plan (Phases A–E) |

## Status

Phase A (foundation: auth, shell, dashboard, payment-return pages) — done.
Next: Phase B1 (Hotels).

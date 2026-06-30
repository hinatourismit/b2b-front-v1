# Backend Audit — Unused / Dead / Inactive Code

What looks unused, duplicated, or not actively exercised. **Verify external consumers before deleting**
anything publisher-facing.

## Confirmed dead

### U1 — `copy` duplicate controllers (delete)
- `controllers/attraction/attractionsOrdersController copy.js`
- `admin/controllers/quotation/admQuotationController copy.js`

Literal "copy" files sitting next to the real ones — not routed, pure dead weight (and a footgun: the
quotation copy is 3,341+ lines that can be edited by mistake).

### U2 — Commented-out route mounts (`app.js`)
- `app.js:93` — `// app.use("/api/v1/hotels/requests", hotelRequestsRouter);`
- `app.js:109` — `// app.use("/api/v1/transfer", transferAvailabilitiesRouter);`

The routers/controllers they point to are built but never mounted → dead endpoints. Either wire them or
remove the routers.

## Not consumed by Hina's own frontends (decide intentionally)

### U3 — `/api/v1/b2b/attraction-api/*` (the publisher surface)
**0** references to `attraction-api` in `b2b-front-main` **or** `b2b-hina-tourism`. This is the
outbound "API-V1" publisher (`b2b/controllers/attractionApi/*`) that exposes the catalog to external
partners (the `api-out-attraction-v1-main` service is the consumer). So it's dead *for the product's own
UI* but may serve external partners — **confirm before removing**; otherwise it's an unmonitored,
order-writing surface.

### U4 — Parallel pricing engine (`attractionOrderCreateHelper`)
Not dead, but redundant: the main b2b checkout uses `attractionOrderCreateHelper2`, while the older
`attractionOrderCreateHelper` is still imported by `b2b/controllers/attractionApi/...OrderController.js`
and `admin-b2b/.../admBookingAttractionOrderController.js`. Two engines, same math → see architecture
A1. Consolidate to one; then one of these becomes deletable.

## Hygiene / noise

### U5 — `console.log` debug statements
**235** files under `b2b/` + `admin/` contain `console.log` (92 files in the active b2b controllers/
helpers alone), including request/response dumps in booking + auth paths. Not "unused code" exactly,
but dead-weight output that should be removed or routed through a logger (see A8).

### U6 — Large commented-out blocks
Several helpers carry big commented-out alternative implementations inline (e.g. the private-transfer
allocation block in the attraction order helper; multiple `// otp: sendOtpEmail(...)` stubs). These rot
and mislead. Remove or move to version control history.

## U6 — Definitive unused-endpoint diff (DONE)
Ran the route×frontend cross-reference for real. Tooling + raw output committed under
[`tools/endpoint-diff.js`](tools/endpoint-diff.js) and
[`tools/endpoint-diff-output.txt`](tools/endpoint-diff-output.txt) — re-runnable with `node`.

**Method.** (1) Resolve every mount: `b2b/index.js` + `admin/index.js` `router.use("/prefix", varName)`,
mapping `varName`→file via a global scan of all `routes/**/*.js` `require`s (handles the nested
domain `index.js` aggregators). (2) Extract `router.<method>("/sub")` (and `.route().get().post()`
chains) per router → full URL. (3) Build a corpus of every `.js/.jsx/.ts/.tsx` string in the consuming
frontends. (4) A route is **uncalled** if no frontend string matches its mount-qualified static path
skeleton (params → wildcard that tolerates `${ a?b }` template expressions). Matching is **path-level**
(a path used by any method counts the path as reachable) — deliberately conservative to avoid false
"dead" claims.

**Confidence & caveats.** Validated by spot-checks (e.g. the admin FE calls bare `/countries`, so the
backend's separate `/countries/all` is correctly flagged; `b2b/orders/*` and the whole `b2b/transfer/*`
prefix have **zero** occurrences in either frontend). False-positive risk remains for any endpoint
consumed by something *not* in these repos — a **mobile app, external integration, cron, or
server-to-server** caller — so the categories below separate "structurally dead" from "no *web* caller
by design." Diffed against: **b2b** → `b2b-front-main` (complete legacy FE) **+** `b2b-hina-tourism` (new);
**admin** → `admin-front-main`. The public `/api/v1/{home,attractions,hotels,visa,…}` (b2c) surface and
`admin-b2b` are **excluded** — their consumer (a b2c storefront) isn't in these repos, so a diff would
falsely flag all of it.

### Results at a glance
| Surface | Distinct endpoints | No frontend caller | % |
|---|---|---|---|
| **b2b** (`/api/v1/b2b`) | 236 | 91 | 39% |
| **admin** (`/api/v1/admin`) | 1274 | 168 | 13% |

### B2B — categorized (91 uncalled)
**Not dead — external/server callers by design (~29):**
- **Partner/publisher API** (token-auth, for external resellers, not the web FE): `attraction-api/*` (5),
  `attraction-api/orders/*` (5), `api/hotels/availabilities/*` (3), `api/hotels/orders/*` (6),
  `api/reseller/auth/*` (2). **= 21.** Extends **U3** — the *entire* partner surface has no web caller;
  confirm at least one external partner consumes it, else it's a whole dead product.
- **Payment-gateway webhooks** (server-to-server redirect, never axios): `attractions/orders/ccavenue/capture`,
  `attractions/orders/complete-tabby`, `hotels/orders/ccavenue/capture`,
  `hotels/orders/payments/ccavenue/capture`, `orders/ccavenue/capture`,
  `resellers/wallet/ccavenue/capture`, `resellers/wallet/razorpay/capture`,
  `transfer/order/ccavenue/capture`. **= 8.** (S0 lives here — the attraction one.)

**Structurally dead — zero references to even the mount prefix in *either* frontend (~44):**
- **Generic `/orders` router** — `create, complete, single/:id, list/all, all/sheet, invoice/:orderId,
  cancel, ccavenue/capture, booking/room-rate` (**9**). Superseded by `attractions/orders` +
  `hotels/orders`; this is the old flight/generic order path. Strong delete candidate (its `PATCH /cancel`
  is also the **S7** unauth route).
- **`/transfer` (entire module)** — availabilities (5) + `transfer/order` (8) + `transfer/client/markup`
  (5) + `transfer/sub-agent/markup` (5) = **23**. The b2b transfer feature is unbuilt in both FEs.
- **`/flight` markup** — client (3) + sub-agent (2) = **5** (flight is deferred).
- **`/tour-packages`** (2) + **`/tour-packages/enquiries`** (2) + **`/promo-code`** (3) = **7**.

**Orphaned individual endpoints in otherwise-live modules (decide per-item, ~18):**
`attractions/orders/cancel` (POST, legacy duplicate of the PATCH cancel),
`attractions/orders/:orderId/cancel/:activityId` (PATCH — **the agent self-service cancel; this is the
AC13 broken-refund path — and the web FE never calls it**, so cancellation is admin-driven in practice;
confirm before relying on AC13's blast radius), `attractions/tickets/single/:ticketId`,
`a2a/orders/:orderId/single/:passengerId`, `a2a/orders/:orderId/cancel/:passengerId`,
`hotels/suggested-hotels`, `home/{about-us,banners,contact-details,sections}` (4 CMS reads),
`settings/{get-in-touch,privacy-and-policies,terms-and-conditions}` (3),
`transactions/all/sheet`, `transactions/sub-agent/:resellerId`, `resellers/auth/delete` (DELETE),
`resellers/client/attraction/banners`, `quotations/hotels/room-type/rate` (**S7** unauth candidate),
`visa/list`, `visa/enquiry/add`.

### ADMIN — categorized highlights (168 uncalled; full list in the output file)
Mostly legitimate dead/duplicate; 13% is a healthy ratio for a 1,274-endpoint admin. Patterns:
- **Redundant `/all` list variants** beside a used bare GET: `countries/all`, `cities/all`,
  `currencies/all`, `states/all`, `users/all/list`, `resellers/all/list`, `quotations/costing/all`, … —
  the FE uses the bare/paginated route; the `/all` twin is dead.
- **CMS editors never wired**: `frontend/b2b/home/*` (7) and `frontend/b2c/home/*` (12) — admin can't
  actually be driving these from `admin-front-main`.
- **Bulk loaders / ops-only** (may be invoked manually/by scripts, confirm before deleting):
  `hotels/hotel-beds/load/*` (11), `hotels/upload`, `resellers/import`, `account/*-payment/import`.
- **Accounting admin** (cross-ref report 06): `account/expense-entry/*`, `account/manual-payment/*`,
  `account/sales-payment/{delete,import,ledger}`, `account/purchase-payment/{delete,import}`,
  `account/final/profit-loss`, `account/group-elements/*` flagged — consistent with these flows being
  half-wired (AC23/AC26).
- **Whole feature areas idle**: `whatsapp-managment/*` + `whatsapp-service/*` (6), `email-receiver-config/*`
  (4), `dashboard/*` CRUD (5), `seo/*` (3), `vendor/attraction/*` (6), `market/*` (3), `promo-code/*` (5),
  `email/image/*`, `transfers/vehicle-types/*` (note: these are declared as **GET** for `add/delete/update`
  — a REST-shape bug worth its own flag).
- **Cancellation/approval endpoints** uncalled from `admin-front-main`:
  `attractions/orders/b2b/approve/canel-request/:cancellationId` [sic — typo "canel" in the route],
  `hotels/orders/{b2b,apiout}/{cancel,confirm,cancel-request/approve}/*`, `orders/b2b/cancel*`,
  `transfers/order/b2b/*` — verify these admin actions are reachable (some may be newer than the FE build).

### Recommended use
1. **Delete now** (after a final `git grep` per item): the generic `/orders` router and the dead
   `/transfer` + flight-markup + promo-code + tour-package b2b modules, and the redundant admin `/all`
   twins. Removing the generic `/orders` router also closes the **S7** unauth `/cancel`.
2. **Confirm-then-decide**: the partner/publisher API (is there a real external consumer?), the bulk
   loaders, and the admin cancellation/CMS endpoints (FE may simply be behind).
3. **Don't touch**: the payment-gateway webhooks (fix S0, don't delete).
Re-run `node docs/backend-audit/tools/endpoint-diff.js` after any FE change to keep the diff current.

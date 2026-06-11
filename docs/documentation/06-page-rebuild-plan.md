# Phase 3 — Page-by-Page Rebuild Plan

> Status: **proposed — awaiting approval**. Implementation starts with Phase A after sign-off.
> All API paths relative to `/api/v1/b2b`. Priorities: **P0** = blocks everything after it, **P1** = feature parity core, **P2** = parity but lower traffic, **P3** = polish/optional.
> Scope per decisions (doc 03): no Flights, no standalone Transfers, CCAvenue + wallet payments only.

## Phase A — Foundation

### A0. Project scaffold (no pages)
`git init`, Vite + React + TS, Tailwind + shadcn/ui, ESLint/Prettier/Vitest, `.env.example`, `config/` (env, branding, modules registry), `lib/api-client.ts` + interceptors, `lib/query-client.ts`, layouts, guards (`ProtectedRoute`, `ModuleGuard`, `ResellerOnly`), shared components seed (DataTable, PageHeader, EmptyState, StatusChip, FileUpload, ConfirmDialog, skeletons). **P0**

### A1. Pages

| Page | Route | APIs Used | Priority | Notes |
| --- | --- | --- | --- | --- |
| Login | `/login` | POST `/resellers/auth/login` | P0 | Handles `status: "pending"` branch → verification page; forgot-password dialog: PATCH `/resellers/forget/password`, PATCH `/resellers/forget/password/confirm` |
| Register | `/register` | POST `/resellers/auth/signup` (multipart) | P0 | Country list from GET `/home/initial-data` |
| Agent verification | `/verification/:agentCode/:randomString` | GET `/resellers/auth/certificate/:agentCode/:randomString` | P1 | Pending-agent status/document page |
| Session bootstrap (no UI) | — | GET `/resellers/auth/getReseller` | P0 | On app load with stored token |
| Main layout | wraps all authed routes | GET `/home/initial-data`, GET `/transactions/balance` | P0 | Header: registry-driven module nav, wallet chip, agent menu |
| Dashboard | `/dashboard` | GET `/transactions/balance`, GET `/orders/list/all` (recent), GET `/quotations/all` (recent), GET `/home` | P1 | New page; cards: balance, recent bookings, recent quotations, quick links to enabled modules |
| Entry denied | `/entrydenied` | — | P0 | No modules enabled |
| 404 / error | `/*`, `/error` | — | P0 | |
| Payment declined | `/payment-decline`, `/b2b/wallet/deposit/:id/cancelled` | — | P0 | CCAvenue return targets — **paths must match exactly** |
| Deposit success | `/b2b/wallet/deposit/:id/success` | — | P0 | CCAvenue return target |

## Phase B — Core Products

### B1. Hotels (default module, `/` home)

| Page | Route | APIs Used | Priority | Notes |
| --- | --- | --- | --- | --- |
| Hotel search home | `/` | GET `/hotels/home`, GET `/hotels/suggested-hotels`, GET `/hotels/availabilities/search/suggestions` | P0 | Hero search: destination/hotel combobox, dates, rooms/pax |
| Results | `/hotel/avail` | POST `/hotels/availabilities/search` | P0 | Filters: price, stars, board; card grid |
| Hotel details | `/hotel/details/:id` | GET `/hotels/availabilities/single/:hotelId`, POST `/hotels/availabilities/single/search` | P0 | Gallery, amenities, room-rate table |
| Checkout | `/hotel/:id/apply/:roomtypeid` | POST `/hotels/availabilities/booking/room-rate` (recheck), POST `/hotels/orders/create`, POST `/hotels/orders/:orderId/complete` (wallet), POST `/hotels/orders/complete/pay-later`, POST `/hotels/orders/payments/initiate` (CCAvenue), GET `/promo-code/list`, POST `/promo-code/eligibilty/check` | P0 | Stepper: guests → payment; pay-later only when rate allows |
| Orders list | `/hotel/order` | GET `/hotels/orders/all` | P0 | Server-paginated table, status chips |
| Order detail | `/hotel/order/:id/details` | GET `/hotels/orders/single/:orderId`, POST `/hotels/orders/cancel/:orderId`, GET `voucher/:orderId`, GET `invoice/:orderId` | P0 | Voucher + invoice PDF downloads |
| Booking success | `/hotel/invoice/:id` | GET `/hotels/orders/single/:orderId` | P0 | CCAvenue/email return target |
| Booking error | `/hotel/invoice/error` | — | P0 | |
| Offline hotel request | (modal from search) | POST `/hotels/requests/new` | P2 | "Can't find your hotel?" |

### B2. Attractions

| Page | Route | APIs Used | Priority | Notes |
| --- | --- | --- | --- | --- |
| Attractions home | `/attraction` | GET `/resellers/client/attraction/banners`, GET `/home/sections`, GET `/resellers/client/attraction/search/list` | P1 | Search-first + curated sections |
| Listing | `/attractions/:slug` | GET `/resellers/client/attraction/all` | P1 | By destination/category, infinite scroll |
| Details | `/attractions/details/:id` | GET `/resellers/client/attraction/single/:id`, POST `.../timeslot`, POST `.../single/price/:activityId` | P1 | Activity selector, date + timeslot, pax pricing, add-to-cart |
| Cart / checkout | `/attractions/payment` | POST `/orders/create`, POST `/orders/complete` (wallet), CCAvenue via `/orders/ccavenue/capture` return | P1 | **Unified order flow** (supports multiple activities); promo-code check |
| Orders list | `/attraction/order` | GET `/attractions/orders/all`, GET `/attractions/orders/all/sheet` (Excel) | P1 | |
| Order detail + tickets | (drawer/page from list) | GET `/attractions/orders/single/:orderId`, GET `:orderId/ticket/:activityId`, GET `.../single/:ticketNo`, PATCH `:orderId/cancel/:activityId`, GET `single/:orderId/invoice` | P1 | Per-activity ticket PDFs and cancellation |
| Invoice success | `/attractions/invoice/:id` | GET `/orders/single/:id`, GET `/orders/invoice/:orderId` | P1 | Return target |
| Invoice error | `/attractions/invoice/error` | — | P1 | |
| Payment approval | `/payment/approval` | — | P1 | Pending-payment return page |

### B3. Visas

| Page | Route | APIs Used | Priority | Notes |
| --- | --- | --- | --- | --- |
| Visa home | `/visa` | GET `/visa/country/all`, GET `/visa/list` | P1 | Country picker |
| Country visas | `/visa/:id` | GET `/visa/type/:visaId/all/:nationalityId`, GET `/visa/all/nationality` | P1 | Visa types + pricing by nationality |
| Apply | `/visa/:id/apply` | POST `/visa/application/create`, POST `/visa/application/payment/:orderId`, POST `/visa/application/document/:orderId` (multipart) | P1 | Steps: travellers → pay → upload docs per traveller |
| Applications list | `/visa/order` | GET `/visa/application/list/all`, GET `.../download/summary/all` (Excel) | P1 | |
| Application detail | `/visa/order/:id/details` | GET `/visa/application/list/:id`, GET `.../:applicationId/traveller/:travellerId` | P1 | Per-traveller status |
| Reapply traveller | `/visa/order/:id/details/:passenger` | POST `/visa/application/:orderId/reapply/:travellerId` (multipart) | P2 | On rejection |
| Apply success | `/visa/apply/invoice/:id` | GET `/visa/application/invoice/:orderId` | P1 | |
| Visa enquiry | (form/modal) | POST `/visa/enquiry/add` | P2 | |

### B4. A2A (fixed air tickets)

| Page | Route | APIs Used | Priority | Notes |
| --- | --- | --- | --- | --- |
| A2A home | `/a2a` | GET `/a2a/date`, POST `/a2a/list/all` | P2 | Sector + date selection |
| Availability | `/a2a/data` | POST `/a2a/list/all`, POST `/a2a/single/:id` | P2 | |
| Booking | `/a2a/booking/:id` | POST `/a2a/single/:id`, POST `/a2a/orders/create` | P2 | Passenger forms |
| Confirm | `/a2a/booking/:id/confirm` | POST `/a2a/orders/complete/:orderId` | P2 | Wallet payment |
| Orders | `/a2a/order` | GET `/a2a/orders/all`, GET `/a2a/orders/download/summary` (Excel) | P2 | |
| Order detail | `/a2a/order/:id` | GET `/a2a/orders/single/:orderId`, GET/PATCH passenger endpoints (ticket PDF, cancel, update) | P2 | Per-passenger actions |

## Phase C — Operations

### C1. Quotations (core B2B workflow)

| Page | Route | APIs Used | Priority | Notes |
| --- | --- | --- | --- | --- |
| Quotation builder | `/quotation` | GET `/quotations/inital/all`, `.../nationality`, `.../visa-type/:id`, POST `.../transfer`, POST `.../excursion/transfer`, GET `.../excursion/list`, `.../excursion/search`, GET `.../meal/list`; hotels: POST `/quotations/hotels/all`, `.../availability`, `.../room-type/rate`, GET `.../search/suggestions`; POST `/quotations/create` | P0(C) | Biggest build item: multi-section builder (pax → hotels/stays → excursions → transfers → meals → guide → visa → markup) backed by Zustand store |
| Quotations list | `/quotation/list` | GET `/quotations/all` | P0(C) | |
| Amendments | `/quotation/list` (expand) | GET `/quotations/amendments/:quotationNumber`, GET `/quotations/amendment/:id` | P0(C) | Version history |
| View / PDF | `/quotation/view` | (amendment data; PDF rendered server-side) | P1 | |
| Email quotation | `/quotation/email` | (send endpoint used by old app — confirm during build) | P1 | |
| Edit (new amendment) | `/quotation/list/edit/:amendment` | PATCH `/quotations/update/:quotationNumber` | P0(C) | Re-uses builder prefilled |
| Confirm amendment | (dialog) | PATCH `/quotations/amendment/confirm/:amendmentId` | P0(C) | Requires unique `employee_reference_number`, `selectedStay`, `occupancyRoomCount` → becomes booking |

### C2. Unified orders & Insurance

| Page | Route | APIs Used | Priority | Notes |
| --- | --- | --- | --- | --- |
| All orders | `/order` hub or per-module tabs | GET `/orders/list/all`, GET `/orders/all/sheet`, GET `/orders/single/:id`, GET `/orders/invoice/:orderId`, PATCH `/orders/cancel` | P1 | Mirrors old OrdersNavigator |
| Insurance home | `/insurance` | GET `/insurance/all`, POST `/insurance/quotation` | P2 | Plan quote |
| Insurance purchase | (flow from quote) | POST `/insurance/initiate-contract`, POST `/insurance/create-contract` | P2 | |
| Insurance orders | `/insurance/order` | GET `/insurance/contracts/all` | P2 | |
| Insurance detail | `/insurance/order/orderView/:id` | GET `/insurance/contracts/single/:contractId`, GET `/insurance/download-contract/:orderId` | P2 | |

## Phase D — Finance & Agency

| Page | Route | APIs Used | Priority | Notes |
| --- | --- | --- | --- | --- |
| Wallet | `/wallet` | GET `/transactions/balance`, GET `/resellers/wallet/deposit/all`, GET `/wallets/deposit-requests/all`, GET `/wallets/withdraw-requests/all`, GET `/wallets/withdrawals/all`, GET `/transactions/all`, GET `/transactions/all/sheet` (Excel), GET `/banks/all`, GET `/company/bank-info/all` | P1 | Tabs: balance+deposit, deposit requests (receipt upload: POST `/wallets/deposit-requests/add`), withdrawals (POST `/wallets/withdraw-requests/initiate`, `.../complete/:id`), transactions. CCAvenue deposit: POST `/resellers/wallet/deposit` → redirect; capture handled by backend |
| Sub-agents list | `/resellers` | GET `/resellers/listAll` | P1 | Reseller-role only (all of this section) |
| Add sub-agent | `/reseller/add` | POST `/resellers/register` | P1 | |
| Sub-agent detail | `/reseller/:id` | GET `/resellers/single/:id`, GET `/transactions/sub-agent/:resellerId`, GET `/configurations/sub-agent/:subAgentId`, POST `/configurations/sub-agent/update` | P1 | Module-access toggles |
| Edit sub-agent | `/reseller/:id/edit` | PATCH `/resellers/update/:subAgentId`, DELETE `/resellers/delete/:subAgentId` | P1 | |
| Attraction markup | `/markup/attraction` | GET `/resellers/client/markup/listall`, PATCH `.../upsert`, DELETE `.../delete/:id`; sub-agent: GET `/resellers/subagent/markup/listall/:subAgentId`, PATCH/DELETE | P1 | Client + sub-agent tabs |
| Visa markup | `/markup/visa` | GET `/client/visa/markup/list`, PATCH `.../upsert`; GET `/subagent/visa/markup/list/:subAgentId`, PATCH `.../upsert` | P1 | |
| Hotel markup | `/markup/hotel` | GET `/hotels/markup/list-categroy`, `.../list-hotel`, `.../list-room-type/:hotelId` (+ `/:resellerId` variants), PATCH room-type/star-category upserts (client + sub-agent) | P1 | |
| Quotation markup | `/markup/quotation` | GET `/quotation/markup/list`, PATCH `.../{client,sub-agent}/upsert` | P1 | |
| Settings | `/settings` | PATCH `/resellers/auth/update/profileSetings`, PATCH `.../update/password`, DELETE `.../delete` | P1 | Profile, password, danger zone |

## Phase E — Finalization

| Item | Route | APIs Used | Priority | Notes |
| --- | --- | --- | --- | --- |
| Landing page | `/landingpageb2b` | GET `/home/banners`, `/home/sections` | P3 | Marketing |
| About / Contact | `/aboutus`, `/contactusb2b` | GET `/home/about-us`, GET `/home/contact-details`, POST `/settings/get-in-touch` | P2 | |
| Terms / Privacy | `/privacy-policy`, `/tabby-terms&conditions` | GET `/settings/terms-and-conditions`, GET `/settings/privacy-and-policies` | P2 | Tabby page kept only as static legal content |
| Dashboard data pass | `/dashboard` | (already wired) | P2 | Real charts once parity reached |
| Tour package enquiry | TBD | `/tour-packages/*` | P3 | Pending scope decision (gap #5) |
| Performance & polish | — | — | P2 | Bundle audit, image lazy-loading, prefetch on hover, skeleton coverage, a11y pass, mobile QA |
| Parity QA | — | — | P1 | Walk old app screen-by-screen against new build; checklist in docs |

## Build order & rationale

1. **A0 → A1** unblocks everything (auth + shell + payment-return routes).
2. **Hotels first** (B1): it's the default module and exercises the whole stack — search, checkout, all three payment paths, PDFs.
3. **Attractions** (B2) adds the unified-cart pattern; **Visas** (B3) adds multipart documents; **A2A** (B4) is low-complexity after those.
4. **Quotations** (C1) is the largest single feature — scheduled after product modules because its builder reuses their lookups (hotels availability, excursions, transfers).
5. **Finance/agency** (D) is mostly tables + forms on a mature foundation.
6. **E** is polish + the long tail.

Deferred backlog (post-parity): Flights module, standalone Transfers, PayPal/Razorpay/Tabby gateways, Tour Packages (if confirmed in scope).

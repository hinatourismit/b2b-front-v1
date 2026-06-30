# Backend Audit — Per-Module Breakdown

Module-by-module status across the active surface. "Scanned" = pattern-scanned + key files spot-read;
"Deep" = read line-by-line. Findings reference the IDs in reports 01/02/04.

| Module (`/api/v1/…`) | Depth | Key findings |
|---|---|---|
| **b2b/attraction** | Deep | **S0 CCAvenue bypass (CRITICAL)**; A1 triple pricing engine; A2 provider-routing `==`; A6 E1001 markup block + dev email (S3); B4/B5/B7/B8; OTP S1. Most-audited (TCTT work). |
| **b2b/hotel** + `hotelApi` | Scanned | CCAvenue capture **verified correctly** (`:1515,2656`); wallet flow shares B1/B2; 2 capture handlers duplicated (A4b); unbounded order finds. Cancellation provider strings (`"tctt"`/`"hotel-beds"`) hardcoded. |
| **b2b/transfer** | Scanned | CCAvenue capture verified (`:678`); OTP 12345 (`:545`); shares wallet B1/B2; pricing markup re-implemented (A5). |
| **b2b/visa** | Scanned | OTP 12345 (`b2bVisaController:197`); wallet flow shared; standard order pattern → inherits A4/A4b. |
| **b2b/flight** | Scanned | OTP 12345 (`:526`); module is *deferred* in the frontend but routes are mounted — partially-active surface. |
| **b2b/insurance** | Scanned | OTP 12345 (`:179`); 3rd-party `Bearer` token calls in `createInsuranceHelper` — confirm token source/expiry; `not available now` thrown on missing data (`:146`). |
| **b2b/a2a** | Scanned | **B3b inconsistent balance check** (balance-only, ignores credit); empty catch `:1900`; own pricing math (A5). |
| **b2b/quotation** | Scanned | `POST /room-type/rate` unauth (S7-verify); large controllers; a `…Controller copy.js` exists in admin quotation (U1). |
| **b2b/order** (generic/flight) | Scanned | `PATCH /cancel` unauth (S7-verify); CCAvenue capture verified (`:510`); shared `b2bCreateOrderHelper` (OTP `:800`). |
| **b2b/wallet + global** | Deep (wallet) | **B1/B2/B2b** atomicity + NaN; wallet-deposit CCAvenue capture verified (`:99`); deposit fee `amount*(CARD_CHARGE||3)` — confirm fee math/units. |
| **b2b/attractionApi** (publisher) | Scanned | Not consumed by Hina FE (U3); uses the older `attractionOrderCreateHelper` (A1/U4); partner-token auth. |
| **admin/** (202 ctrls) | Representative | OTP 12345 in admin order/visa/flight/quotation creators; 15 empty catches (accounts/quotation/attraction); `admQuotationController copy.js` dead (U1); accounts/reporting **not deep-read**. |
| **admin-b2b/** (7 ctrls) | Scanned | Uses `attractionOrderCreateHelper` + wallet utils → inherits A1/B1/B2. |
| **b2c/** + public | Scanned | Public catalog/order/payment; CCAvenue handled in `controllers/order`; **not deep-read** — recommend a dedicated pass (public surface = higher exposure). |

## Cross-cutting (apply almost everywhere)
- **Wallet B1/B2/B2b/B3b** — every module that takes payment.
- **OTP S1** — 31 sites; every create→complete flow.
- **A4/A4b** — no transactions; capture/settlement copy-pasted per module (root cause of S0).
- **Hygiene** — 235 files with `console.log`; 34 TODO/FIXME/HACK; 18 empty catches; loose `==` on ids.

## Not yet deep-read (offer)
- **admin accounts** (ledger/sales/purchase/journal) — financial integrity, densest code.
- **admin quotation** (multi-thousand-line controllers + a `copy`).
- **b2c public site** (exposure surface).
- ~~The definitive unused-endpoint diff~~ **DONE** — report 03 §U6 (b2b 91/236, admin 168/1274 uncalled).

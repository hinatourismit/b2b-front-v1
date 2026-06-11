# Backend Analysis — `/api-server-main`

> Phase 1 deliverable. Reference only — this backend must not be modified.
> Analyzed: 2026-06-12

## 1. Stack & Architecture

| Aspect | Detail |
| --- | --- |
| Runtime | Node.js + Express 4 (CommonJS) |
| Database | MongoDB via Mongoose 6 (`mongoose-sequence` for counters, slug generator) |
| Auth | JWT (`jsonwebtoken`), bcryptjs password hashing |
| Validation | Joi 17 (`src/b2b/validations/`) |
| File upload | Multer (receipts, visa documents, profile images) |
| PDF/Docs | Puppeteer, pdfkit, ejs templates (vouchers, invoices, tickets) |
| Payments | CCAvenue (`node-ccavenue`), PayPal, Razorpay, Stripe, Tabby (via order endpoints) |
| Email/SMS | Nodemailer, Twilio, WhatsApp (`whatsapp-web.js`) |
| Cache | Redis (partially used; `.cache()` call commented out in auth) |
| Jobs | node-cron / node-schedule (`src/cron.js`) |
| Logging | Winston + console request logger middleware |

### Entry & mounting (`src/app.js`)

The server is a single Express app serving **four API surfaces**:

| Prefix | Router | Audience |
| --- | --- | --- |
| `/api/v1/*` (home, users, attractions, hotels, visa, transfer, orders, tour-packages, b2c…) | `src/routes` | B2C public site |
| `/api/v1/admin` | `src/admin` | Admin panel |
| `/api/v1/b2b` | `src/b2b` | **B2B agent portal ← our scope** |
| `/api/v1/admin-b2b` | `src/admin-b2b` | Admin booking portal |

Also: `/public` static files, a generic `/proxy` POST passthrough, and a ticket-download route.

**The new frontend only consumes `/api/v1/b2b/**` (plus `/public` for assets).**

### Error handling

All errors go through `src/helpers/sendErrorResponse.js`:

```json
{ "error": "<message>", "status": <httpStatus> }
```

- 500s are persisted to an `ErrorLog` collection.
- There is **no global error middleware**; every controller try/catches and calls the helper.
- Success responses have **no uniform envelope** — each controller returns its own shape (sometimes raw documents, sometimes `{ message }`, sometimes named keys). The new frontend must type each endpoint individually.

## 2. Authentication (B2B)

Middlewares: `src/b2b/middlewares/`

| Middleware | Behavior |
| --- | --- |
| `b2bAuth` | Reads `Authorization: Bearer <token>` → `jwt.verify(JWT_SECRET)` → loads `Reseller` where `_id` matches **and `jwtToken === token`** → attaches `req.reseller` (populated with `marketStrategy`, `configuration`, `country`). 401 otherwise. |
| `b2bResellerAuth` | Same, plus requires `reseller.role === "reseller"` (blocks sub-agents). |
| `b2bApiAccessMiddleware` | API-key style access for the partner API routes (`/attraction-api`, `/api/hotels/*`). Not used by the web portal. |

Key facts:

- **Single active session**: the token is stored on the Reseller document (`jwtToken`); a new login invalidates the previous token.
- **No refresh token** for the web portal (the partner API at `/api/reseller/auth` has a `/token` refresh, but the portal does not use it). On 401 the frontend simply logs out.
- **Roles**: `reseller` (master agent) and `sub-agent`. Sub-agents are created by resellers via `/resellers/register`.
- **Account states**: `pending` (login returns 200 with `status: "pending"` + `agentCode` + `randomString` for the document-upload verification page), non-`ok` (400 with "disabled" message), `ok` (full login).
- **Agent code at login**: when the backend env has `LOGIN_AGENTCODE_REQUIRED=true` (production does), the login body's `agentCode` must match the account or the API returns 400 "Invalid credentials" — even with a correct password. The login form must always collect agent code.
- **Login response** (`POST /b2b/resellers/auth/login`):
  ```json
  { "status": "ok", "reseller": { ...resellerDoc, "configuration": {...} }, "jwtToken": "...", "agentCode": 123 }
  ```
- **Module gating**: `reseller.configuration` carries per-agent feature flags — `showAttraction`, `showHotel`, `showFlight`, `showVisa`, `showA2a`, `showQuotaion` *(note the backend typo — must be preserved)*, `showInsurance`. The frontend gates whole modules on these.
- Forgot password: OTP flow (`PATCH /resellers/forget/password` → `PATCH /resellers/forget/password/confirm`).

## 3. B2B Endpoint Inventory

All paths below are relative to **`/api/v1/b2b`**. Auth column: 🔒 = `b2bAuth`, 🔒R = `b2bResellerAuth` (reseller role only), ⚪ = public/unauthenticated.

### Auth & Profile (`/resellers/auth`)

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/resellers/auth/signup` | ⚪ | Agent registration (multipart, attachments) |
| POST | `/resellers/auth/login` | ⚪ | Login → reseller + jwtToken |
| GET | `/resellers/auth/getReseller` | 🔒 | Current agent (session bootstrap) |
| PATCH | `/resellers/auth/update/profileSetings` | 🔒 | Update profile (multipart image) |
| PATCH | `/resellers/auth/update/password` | 🔒 | Change password |
| DELETE | `/resellers/auth/delete` | 🔒 | Delete account |
| GET | `/resellers/auth/certificate/:agentCode/:randomString` | ⚪ | Pending-agent verification details |

### Sub-agents (`/resellers`)

| Method | Endpoint | Auth |
| --- | --- | --- |
| POST | `/resellers/register` | 🔒R |
| GET | `/resellers/listAll` | 🔒R |
| GET | `/resellers/single/:id` | 🔒R |
| PATCH | `/resellers/update/:subAgentId` | 🔒R |
| DELETE | `/resellers/delete/:subAgentId` | 🔒R |
| PATCH | `/resellers/forget/password` | ⚪ (OTP) |
| PATCH | `/resellers/forget/password/confirm` | ⚪ |
| POST | `/configurations/sub-agent/update` | 🔒R (sub-agent module access) |
| GET | `/configurations/sub-agent/:subAgentId` | 🔒R |

### Wallet & Finance

| Method | Endpoint | Auth |
| --- | --- | --- |
| POST | `/resellers/wallet/deposit` | 🔒 |
| GET | `/resellers/wallet/deposit/all` | 🔒 |
| POST | `/resellers/wallet/paypal/capture` | 🔒 |
| POST | `/resellers/wallet/razorpay/capture` | 🔒 |
| POST | `/resellers/wallet/ccavenue/capture` | ⚪ (gateway callback) |
| POST | `/wallets/deposit-requests/add` | 🔒 (multipart `receipt`) |
| GET | `/wallets/deposit-requests/all` | 🔒 |
| POST | `/wallets/withdraw-requests/initiate` | 🔒 |
| POST | `/wallets/withdraw-requests/complete/:id` | 🔒 |
| GET | `/wallets/withdraw-requests/all` | 🔒 |
| GET | `/wallets/withdrawals/all` | 🔒 |
| GET | `/transactions/all` | 🔒 |
| GET | `/transactions/all/sheet` | 🔒 (Excel export) |
| GET | `/transactions/sub-agent/:resellerId` | 🔒 |
| GET | `/transactions/balance` | 🔒 |
| GET | `/banks/all` | 🔒 |
| GET | `/company/bank-info/all` | 🔒 |

### Attractions (Tours)

| Method | Endpoint | Auth |
| --- | --- | --- |
| GET | `/resellers/client/attraction/all` | 🔒 |
| GET | `/resellers/client/attraction/single/:id` | 🔒 |
| POST | `/resellers/client/attraction/timeslot` | 🔒 |
| POST | `/resellers/client/attraction/single/price/:activityId` | 🔒 |
| GET | `/resellers/client/attraction/banners` | ⚪ |
| GET | `/resellers/client/attraction/search/list` | ⚪ |
| POST | `/attractions/orders/create` | 🔒 |
| POST | `/attractions/orders/complete/:orderId` | 🔒 |
| POST | `/attractions/orders/complete-tabby` | ⚪ (Tabby callback) |
| POST | `/attractions/orders/ccavenue/capture` | ⚪ (gateway callback) |
| POST | `/attractions/orders/cancel` | 🔒 |
| PATCH | `/attractions/orders/:orderId/cancel/:activityId` | ⚪* |
| GET | `/attractions/orders/all` | 🔒 |
| GET | `/attractions/orders/all/sheet` | 🔒 (Excel) |
| GET | `/attractions/orders/single/:orderId` | 🔒 |
| GET | `/attractions/orders/single/:orderId/invoice` | 🔒 (PDF) |
| GET | `/attractions/orders/:orderId/ticket/:activityId` | ⚪ (ticket PDF) |
| GET | `/attractions/orders/:orderId/ticket/:activityId/single/:ticketNo` | ⚪ |
| GET | `/attractions/tickets/single/:ticketId` | 🔒 |

### Hotels

| Method | Endpoint | Auth |
| --- | --- | --- |
| GET | `/hotels/home` | 🔒 |
| GET | `/hotels/suggested-hotels` | 🔒 |
| GET | `/hotels/availabilities/search/suggestions` | 🔒 |
| POST | `/hotels/availabilities/search` | 🔒 (multi-hotel availability) |
| POST | `/hotels/availabilities/single/search` | 🔒 (one hotel, all rooms) |
| GET | `/hotels/availabilities/single/:hotelId` | 🔒 (static details) |
| POST | `/hotels/availabilities/booking/room-rate` | 🔒 (rate recheck before book) |
| POST | `/hotels/orders/create` | 🔒 |
| POST | `/hotels/orders/:orderId/complete` | 🔒 (wallet) |
| POST | `/hotels/orders/complete/pay-later` | 🔒 |
| POST | `/hotels/orders/payments/initiate` | 🔒 |
| POST | `/hotels/orders/payments/wallet/capture/:paymentId` | 🔒 |
| POST | `/hotels/orders/payments/ccavenue/capture` | ⚪ (callback) |
| POST | `/hotels/orders/ccavenue/capture` | ⚪ (callback) |
| GET | `/hotels/orders/all` | 🔒 |
| GET | `/hotels/orders/single/:orderId` | 🔒 |
| POST | `/hotels/orders/cancel/:orderId` | 🔒 |
| GET | `/hotels/orders/voucher/:orderId` | 🔒 (**voucher PDF**) |
| GET | `/hotels/orders/invoice/:orderId` | 🔒 (invoice PDF) |
| POST | `/hotels/requests/new` | 🔒 (offline hotel request) |

### Transfers

| Method | Endpoint | Auth |
| --- | --- | --- |
| GET | `/transfer/search/suggestions` | ⚪ |
| POST | `/transfer/search` | ⚪ |
| GET | `/transfer/banners` | 🔒 |
| POST | `/transfer/order/create` | 🔒 |
| POST | `/transfer/order/complete` | 🔒 |
| POST | `/transfer/order/ccavenue/capture` | ⚪ (callback) |
| GET | `/transfer/order/list/all` | 🔒 |
| GET | `/transfer/order/single/:id` | 🔒 |
| GET | `/transfer/order/invoice/:orderId` | 🔒 |
| GET | `/transfer/order/ticket/:orderId` | ⚪ |
| PATCH | `/transfer/order/:orderId/cancel/:transferId` | ⚪* |

### Visas

| Method | Endpoint | Auth |
| --- | --- | --- |
| GET | `/visa/country/all` | ⚪ |
| GET | `/visa/all/nationality` | ⚪ |
| GET | `/visa/type/:visaId/all/:nationalityId` | 🔒 |
| GET | `/visa/list` | 🔒 |
| POST | `/visa/application/create` | 🔒 (apply) |
| POST | `/visa/application/payment/:orderId` | 🔒 |
| POST | `/visa/application/document/:orderId` | 🔒 (multipart docs) |
| POST | `/visa/application/:orderId/reapply/:travellerId` | 🔒 (multipart) |
| GET | `/visa/application/invoice/:orderId` | 🔒 |
| GET | `/visa/application/list/all` | 🔒 |
| GET | `/visa/application/list/download/summary/all` | 🔒 (Excel) |
| GET | `/visa/application/list/:id` | 🔒 |
| GET | `/visa/application/list/:applicationId/traveller/:travellerId` | 🔒 |
| POST | `/visa/enquiry/add` | 🔒 |

### Flights & A2A (air-to-air fixed tickets)

| Method | Endpoint | Auth |
| --- | --- | --- |
| POST | `/flight/search/availability` | 🔒 |
| POST | `/flight/addToCart` | 🔒 |
| GET | `/flight/details/:tbId` | 🔒 |
| GET | `/flight/details/:tbId/ancillaries` | 🔒 |
| POST | `/flight/ancillaries/add` | 🔒 |
| POST | `/flight/bookings/initiate` | 🔒 |
| POST | `/flight/bookings/complete` | 🔒 |
| GET | `/flight/bookings/:bookingId` | 🔒 |
| GET | `/flight/bookings/pdf/:bookingId` | 🔒 |
| GET | `/flight/bookings/invoice/:bookingId` | 🔒 |
| GET | `/flight/bookings/list/all` | 🔒 |
| GET | `/flight/bookings/list/initial-data` | 🔒 |
| GET | `/flight/fares-by-date` | 🔒 |
| GET | `/a2a/date` | 🔒 |
| POST | `/a2a/list/all` | 🔒 |
| POST | `/a2a/single/:id` | 🔒 |
| GET | `/a2a/single/ticket/:id` | 🔒 |
| POST | `/a2a/orders/create` | 🔒 |
| POST | `/a2a/orders/complete/:orderId` | 🔒 |
| GET | `/a2a/orders/all` | 🔒 |
| GET | `/a2a/orders/single/:orderId` | 🔒 |
| GET | `/a2a/orders/:orderId/single/:passengerId` | 🔒 |
| PATCH | `/a2a/orders/:orderId/cancel/:passengerId` | 🔒 |
| PATCH | `/a2a/orders/:orderId/update/:passengerId` | 🔒 |
| GET | `/a2a/orders/ticket/:orderId/single/:passengerId` | 🔒 (PDF) |
| GET | `/a2a/orders/single/ticket/:orderId` | ⚪ (PDF) |
| GET | `/a2a/orders/download/summary` | 🔒 (Excel) |

### Quotations

| Method | Endpoint | Auth |
| --- | --- | --- |
| POST | `/quotations/create` | 🔒 |
| PATCH | `/quotations/update/:quotationNumber` | 🔒 (creates amendment) |
| GET | `/quotations/all` | 🔒 |
| GET | `/quotations/amendments/:quotationNumber` | 🔒 |
| GET | `/quotations/amendment/:id` | 🔒 |
| PATCH | `/quotations/amendment/confirm/:amendmentId` | 🔒 (**confirm → booking**, requires `employee_reference_number`) |
| GET | `/quotations/inital/all` | ⚪ (lookup data; note backend spelling "inital") |
| GET | `/quotations/inital/nationality` | ⚪ |
| GET | `/quotations/inital/visa-type/:id` | 🔒 |
| POST | `/quotations/inital/transfer` | 🔒 |
| POST | `/quotations/inital/excursion/transfer` | 🔒 |
| GET | `/quotations/inital/excursion/list` | 🔒 |
| GET | `/quotations/inital/excursion/search` | 🔒 |
| GET | `/quotations/inital/meal/list` | 🔒 |
| POST | `/quotations/hotels/all` | 🔒 |
| POST | `/quotations/hotels/room-type/rate` | ⚪ |
| POST | `/quotations/hotels/availability` | 🔒 |
| GET | `/quotations/hotels/search/suggestions` | 🔒 |

### Insurance

| Method | Endpoint | Auth |
| --- | --- | --- |
| GET | `/insurance/all` | 🔒 (plans) |
| POST | `/insurance/quotation` | 🔒 |
| POST | `/insurance/initiate-contract` | 🔒 |
| POST | `/insurance/create-contract` | 🔒 |
| GET | `/insurance/download-contract/:orderId` | 🔒 |
| GET | `/insurance/contracts/all` | 🔒 |
| GET | `/insurance/contracts/single/:contractId` | 🔒 |

### Markups (agent → client and reseller → sub-agent pricing)

| Domain | Endpoints |
| --- | --- |
| Attraction (client) | `PATCH /resellers/client/markup/upsert`, `DELETE /resellers/client/markup/delete/:id`, `GET /resellers/client/markup/listall` — all 🔒 |
| Attraction (sub-agent) | `PATCH /resellers/subagent/markup/upsert`, `DELETE .../delete/:id`, `GET .../listall/:subAgentId` — all 🔒 |
| Visa (client) | `PATCH /client/visa/markup/upsert`, `GET /client/visa/markup/list` — 🔒 |
| Visa (sub-agent) | `PATCH /subagent/visa/markup/upsert` 🔒R, `GET /subagent/visa/markup/list/:subAgentId` 🔒 |
| Flight (client) | `PATCH /client/flight/markup/upsert`, `GET /client/flight/markup/list` — 🔒 |
| Flight (sub-agent) | `PATCH /subagent/flight/markup/upsert`, `GET .../list/:subAgentId` — 🔒 |
| Hotel | `GET /hotels/markup/list-categroy` *(sic)*, `/list-hotel`, `/list-room-type/:hotelId`, `/list-categroy/:resellerId`, `/list-room-type/:hotelId/:resellerId`; `PATCH /hotels/markup/{client,sub-agent}/room-type/upsert`, `PATCH /hotels/markup/{client,sub-agent}/star-category/upsert` — all 🔒 |
| Quotation | `PATCH /quotation/markup/{sub-agent,client}/upsert`, `GET /quotation/markup/list` — 🔒 |
| Transfer (client) | `GET /transfer/client/markup/get-all-transfer`, `GET .../get-all-vehicle/:transferId`, `POST .../update-single-transfer-profile` — 🔒 |
| Transfer (sub-agent) | same shape under `/transfer/sub-agent/markup` — 🔒 |

### Unified Orders, Home, Misc

| Method | Endpoint | Auth |
| --- | --- | --- |
| POST | `/orders/create` | 🔒 (**unified cart order**: attractions + transfers) |
| POST | `/orders/complete` | 🔒 |
| POST | `/orders/ccavenue/capture` | ⚪ (callback) |
| GET | `/orders/list/all` | 🔒 |
| GET | `/orders/single/:id` | ⚪* |
| GET | `/orders/invoice/:orderId` | ⚪* |
| GET | `/orders/all/sheet` | 🔒 (Excel) |
| PATCH | `/orders/cancel` | ⚪* |
| GET | `/home/banners`, `/home/sections`, `/home`, `/home/initial-data`, `/home/contact-details`, `/home/about-us` | ⚪ |
| GET | `/settings/terms-and-conditions`, `/settings/privacy-and-policies` | ⚪ |
| POST | `/settings/get-in-touch` | ⚪ |
| GET | `/promo-code/list` | 🔒 |
| POST | `/promo-code/eligibilty/check` | 🔒 *(sic)* |
| POST | `/tour-packages/enquiries/new` | 🔒 |
| GET | `/tour-packages/enquiries/all` | 🔒 |
| GET | `/tour-packages/all` | 🔒 |
| GET | `/tour-packages/single/:id` | 🔒 |

⚪* = endpoints that look like they should require auth but don't have the middleware — they rely on order IDs being unguessable. **Preserve behavior; do not "fix" by assuming auth headers are required.**

### Partner API (out of scope for the web portal)

`/api/reseller/auth/*`, `/attraction-api/*`, `/api/hotels/*` use API-key middleware and serve third-party integrators, not the web frontend.

## 4. Future Microservice Boundaries (documentation only)

Natural seams visible in the code (each already has its own routes/controllers/models folder):

| Candidate service | Current code seam |
| --- | --- |
| Auth/Agent Service | `b2b/routes/auth`, `global/b2bResellersAuthRouter`, Reseller + ResellerConfiguration models |
| Wallet/Payments Service | `global/b2bWallet*`, transactions, withdrawals, payment gateway captures |
| Attraction Service | `routes/attraction`, attraction models |
| Hotel Service | `routes/hotel` + `hotelApi` (already API-shaped) |
| Transfer Service | `routes/transfer` |
| Visa Service | `routes/visa` |
| Flight Service | `routes/flight` + `a2a` (already proxies an external flight supplier via `tbId`) |
| Quotation Service | `routes/quotation` (largest single controller, ~6k+ lines) |
| Insurance Service | `routes/insurance` (external contract provider) |
| Order/Booking Service | `routes/order` (unified cart spanning attraction + transfer) |
| Content/CMS Service | `global/b2bHomeRouter`, `b2bFrontendRouter` (banners, sections, T&C) |
| Reporting Service | the `/sheet` and `/download/summary` Excel endpoints scattered per-module |

Implication for the frontend: one API service module per domain above, with base paths centralized so a future host/path split is a config change.

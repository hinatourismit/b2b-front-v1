# Backend Audit — Security

Auth, secrets, input handling. Now covers the full b2b/admin surface (payment captures across all
order modules).

## S0 — CCAvenue payment bypass on attraction capture (CRITICAL)
`b2b/controllers/attraction/b2bAttractionOrderController.js:532-538`
```js
// const { encResp } = req.body;
// const decryptedJsonResponse = ccav.redirectResponseToJson(encResp);
const { order_id, order_status } = req.body;   // ← trusted straight from the POST body
...
if (order_status !== "Success") { /* fail */ }  // ← "Success" path completes the order
```
The CCAvenue **signature decryption is commented out**, so `order_status` is taken from the raw request
body and **never verified against the gateway**. The capture route is (correctly) unauthenticated —
`b2b/routes/attraction/b2bAttractionOrdersRoute.js:24` (`/ccavenue/capture`, no `b2bAuth`) — so the
gateway can call it; but that means signature verification is the *only* control, and it's missing.
**Impact:** anyone can `POST { order_id: <pendingPaymentId>, order_status: "Success" }` and complete a
pending attraction order (issue tickets / mark paid) **without paying**.

**This is an inconsistency, not a pattern** — every other module verifies correctly:
`global/b2bWalletDepositController.js:99`, `transfer/transferOrderController.js:678`,
`hotel/b2bHotelOrdersController.js:1515,2656`, `order/orderController.js:510` all call
`ccav.redirectResponseToJson(encResp)` and read `order_status` from the **decrypted** response. The
attraction handler was evidently left in a debug state.

**Fix:** restore decryption (use the same `redirectResponseToJson(encResp)` as the others), read
`order_status`/`order_id` from the decrypted payload, and additionally **verify the paid amount equals
the order amount** (none of the handlers cross-check amount today — a secondary hardening for all of
them).

## S1 — Wallet-completion OTP is a hardcoded constant `12345` (High)
Every order-completion flow stamps the order's `otp` to `12345` at create and the complete endpoint
accepts only `otp === 12345`:
- `b2b/controllers/attraction/b2bAttractionOrderController.js:160` (`otp: 12345`), with the real
  OTP-email call commented out at `:162`.
- Same pattern: `transfer/transferOrderController.js:545`, `flight/b2bFlightController.js:526`,
  `visa/b2bVisaController.js:197`, `insurance/b2bInsuranceController.js:179`,
  `helpers/order/b2bCreateOrderHelper.js:800`; admin order controllers and
  `admin/helpers/quotation/quotationExcusionHelper.js:1636` mirror it.

The "OTP" therefore authorizes nothing — any caller who can create an order can complete it by sending
`12345`. The only real gate is the agent JWT. **Fix:** implement a genuine OTP (email/SMS, random,
single-use, expiring) or drop the OTP pretense so it isn't mistaken for a control.

## S2 — Auth error object returned to the client (Med)
`b2b/middlewares/b2bAuth.js` → `sendErrorResponse(res, 401, err)` serializes the caught error (stack /
internal message) into the 401 response, and `console.log(err)` logs it every failure. Return a fixed
`"invalid token"` string; log server-side only.

## S3 — Hardcoded dev recipients in a production path (Med)
`b2b/controllers/attraction/b2bAttractionOrderController.js:255-256` emails
`["suhaib2533@gmail.com", "salmanvp777@gmail.com"]` whenever an activity has no profile markup (A6).
Personal/dev addresses hardwired into a live order flow — remove or move to config; these fire in prod.

## S4 — Unescaped user input into `$regex` (Low→Med)
Search endpoints build `{ $regex: search, $options: "i" }` directly from the raw query (e.g.
`b2bClientAttractionController.searchDestinationAndAtt`). Risks: ReDoS on crafted patterns, and
unintended matching (regex metacharacters). **Fix:** escape the input or use a text index / anchored
match.

## S5 — Single-session token model is sound but brittle (Low)
`b2bAuth` stores the active `jwtToken` on the reseller and matches it per request (single active
session). Good for revocation, but: (a) a new login silently logs out the old session with no signal,
(b) it's an extra write on login and a read on every request. Acceptable; document the behavior so it
isn't mistaken for a bug.

## S6 — Hardcoded third-party API key in source (Med→High)
`b2b/helpers/hotel/migrationHelper.js:29,149,247,587,702` — `apikey: "b1d61509-73bb-4744-a22b-014e20a835ff"`
hardcoded (5×). A live credential committed to source. Move to env + rotate the key (it should be
considered compromised). Confirm whether `migrationHelper` is still wired or dead (if dead, see
unused-code) — either way the key is exposed.

## S7 — Order-cancel route appears unauthenticated (verify) (Med)
`b2b/routes/order/b2bOrderRouter.js:24` — `router.patch("/cancel", cancelB2bOrder)` has no `b2bAuth` on
the line (most siblings do). Same for `b2b/routes/quotation/b2bQuotationHotelRouter.js:12`
(`POST /room-type/rate`). **Verify** the router doesn't apply `router.use(b2bAuth)` at mount; if not,
an unauthenticated caller can cancel orders / pull rate data. (The `hotelApi`/`attractionApi` routes use
the partner-token `*AccessMiddleware`, which is auth — those are fine; the public `…/attractions/price`
there may be intentional.)

## Positives (verified, no action)
- **No** `$where`, `eval`, or `new Function` usage found in b2b/admin → no obvious server-side JS
  injection vector.
- JWT verified with `jwt.verify(token, JWT_SECRET)` (not decode-only) and the token is bound to the
  reseller record — reasonable.
- Mongo queries use field equality / `$in` (not string-concatenated queries) → low NoSQL-injection
  surface, aside from S4.

## Worth checking next (not yet reviewed)
- Payment capture endpoints (CCAvenue/Tabby) — signature verification and the `redirectUrl`/`orderId`
  handling on the public capture routes.
- Admin auth + RBAC enforcement consistency across the 202 admin controllers (pattern-sampled only).
- File-upload (multer) destinations/limits/type-validation across upload routes.

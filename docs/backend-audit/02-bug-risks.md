# Backend Audit — Bug Risks (null / type / concurrency / error-handling)

Concrete defects and likely-bug scenarios on the active surface. `file:line` cited.

## Money / wallet (highest impact)

### B1 — `checkWalletBalance` returns "sufficient" on `NaN` (High)
`b2b/utils/wallet/checkWalletBalance.js:5`
```js
wallet?.balance + (wallet?.creditAmount - wallet?.creditUsed) < Number(amount)
```
If `creditAmount` or `creditUsed` is `undefined` (a wallet doc that never set them), `undefined - x`
→ `NaN`, so `balance + NaN` → `NaN`, and `NaN < amount` is **`false`** → the function returns
**`true` (has balance)**. An order then proceeds and `deductAmountFromWallet` drives the balance to 0
and silently piles the rest onto `creditUsed` (B3). **Fix:** coerce with defaults
(`Number(creditAmount)||0`, `Number(creditUsed)||0`) and reject `NaN`.

### B2 — Wallet deduction is not atomic → double-spend race (High)
`b2b/utils/wallet/deductAmountFromWallet.js`
```js
wallet.balance -= tmpAmount; await wallet.save();
```
This is read-modify-write on an in-memory mongoose doc. The flow is `checkWalletBalance(...)` then
`deductAmountFromWallet(...)` as **separate** steps. Two concurrent completions for the same reseller
both pass the check, then both deduct → **overdraft / double-spend**. **Fix:** atomic conditional
update — `findOneAndUpdate({ _id, balance: { $gte: amount } }, { $inc: { balance: -amount } })` — and
treat a no-match as insufficient funds.

### B2b — Wallet top-up is also non-atomic (High)
`b2b/utils/wallet/addMoneyToB2bWallet.js` — same read-modify-write (`wallet.balance += ...; wallet.save()`).
A concurrent top-up + deduction (or two top-ups) lose updates. (It does guard `!isNaN` — better than
deduct/check, but still not atomic.) The wallet helpers are used by **8 b2b + 8 admin + 2 admin-b2b**
modules, so B1/B2/B2b affect every booking + deposit flow, not just attractions.

### B3b — Inconsistent "has funds?" logic across modules (Med)
Two different balance checks coexist:
- `checkWalletBalance` → `balance + (creditAmount - creditUsed) >= amount` (includes credit).
- A2A does it inline: `admin/controllers/a2a/admCreateA2aOrderController.js:698,722` →
  `if (!wallet || wallet.balance < amount)` (**balance only**, ignores credit).

So the same agent can pay with credit for attractions but is refused for A2A — and the inline check
also misses the B1 NaN class differently. **Fix:** one shared, correct `hasFunds()` used everywhere.

### B3 — Credit overdraw without bound (Med)
`b2b/utils/wallet/deductAmountFromWallet.js:6-8` — when `balance < amount` it sets `balance = 0` and
`creditUsed += amount - balance` with **no check** that `creditAmount` covers the new `creditUsed`. It
trusts the caller ran `checkWalletBalance` first — but that's B1-buggy and not transactional (B2). Net:
a wallet can go past its credit limit.

## Type / null / coercion

### B4 — Loose `==` comparing ObjectId to string for supplier routing (Med)
`b2b/helpers/attraction/b2bAttractionOrderHelper.js:588,649,742,773,1545`,
`b2b/controllers/attraction/b2bAttractionOrderController.js:848`,
`b2b/controllers/attraction/b2bClientAttractionController.js:870,880`
```js
activity.attraction.connectedApi == "63f0a47b479d4a0376fe12f4"
```
Relies on `ObjectId → string` coercion via `==`. If `connectedApi` is ever populated to an object, or
is `null`/absent, the comparison silently fails and the activity mis-routes (wrong supplier or the
internal branch). **Fix:** `String(connectedApi) === "<id>"` (and a shared provider registry — see A2).

### B6 — `JSON.parse` without try/catch (Med)
41 `JSON.parse` call sites across `b2b`/`admin`. Several parse request/3rd-party payloads without a
guard → a malformed body throws and 500s (or crashes an un-try'd helper). **Fix:** wrap parses of
external input; validate shape.

### B7 — Unguarded array/index access in ticket/pricing paths (Med)
- `b2b/helpers/attraction/b2bAttractionTicketHelper.js:113` — `orderDetails[0].activities...` with no
  empty-array guard.
- Supplier mappers index `data.MediaCodeList[j]` / `Prices[0]` (DPR/Burj) assuming non-empty supplier
  responses. A short/empty supplier payload throws mid-booking.

### B8 — Division by pax/count/100 → NaN/Infinity prices (Med)
~31 division sites in `b2b/helpers/attraction/*` (per-pax, `/100` markup, vehicle splits). If
`totalPax`/`count` is 0 (e.g. all counts zero slipping past validation), prices become `NaN`/`Infinity`
and persist onto the order. **Fix:** guard divisors; assert pax ≥ 1 before pricing.

### B9b — Broken date math in cancellation cutoff (Med)
`b2b/controllers/attraction/b2bAttractionOrderController.js:767` —
`new Date().setDate(0, 0, 0, 0)`. `Date.setDate` takes **one** argument; `0` rolls the day to the
**last day of the previous month** (extra args ignored). The intended `setHours(0,0,0,0)` (today
midnight) was meant. So the "can't cancel after the activity date" guard compares against a wrong date
→ it lets late cancellations through (or blocks valid ones) depending on the calendar. **Fix:**
`new Date().setHours(0, 0, 0, 0)`.

### B10 — Case-folded idempotency key (Low)
Order create lowercases `agentReferenceNumber` (`agentReferenceNumber?.toLowerCase()`) for the
"duplicate order" check. Two refs differing only by case collide; also a `null` ref → `undefined`. Use
the raw value (trimmed) and require it.

## Error handling

### B5 — Silent empty catches (Med)
`catch (err) {}` swallows failures at e.g. `b2b/controllers/a2a/b2bA2aOrderController.js:1900`,
`b2b/helpers/burjKhalifaApiHelper.js:714`, `admin/controllers/attraction/admAttractionsController.js:593`,
`admin/controllers/attraction/admAttractionCreateOrderController.js:89`,
`admin/controllers/orders/admOrdersController.js:627`, plus several accounts/quotation controllers. A
failed supplier call / ticket op / accounting write disappears with no trace. **Fix:** at minimum log
with context; decide fail-open vs fail-closed deliberately.

### B11 — Auth returns the raw error object to the client (Low→Med)
`b2b/middlewares/b2bAuth.js` — `sendErrorResponse(res, 401, err)` serializes the caught error to the
response (info leak), and `console.log(err)` on every failure. Return a fixed message.

## Already found & fixed this session (✅ for completeness)
- `getTimeSlot` 500 when the Burj supplier 401s (uncaught) → now caught, TCTT serves. ✅
- Slot `Available` is a number from TCTT but schema required a string → schema relaxed. ✅
- `b2bTimeSlot.schema.js` required `productId`/`productCode` → optional. ✅
- Resolver used `/rate` for timeslot activities (409) → dedicated slot-based path. ✅
See `docs/documentation/12-tctt-source-resolver.md` + memory for details.

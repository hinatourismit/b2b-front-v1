# TCTT Integration — End-to-End Test Report (Hina path)

> Date: 2026-06-24. Environment: `api-server-main` running locally on **:8089**, connected to the
> **`test-db`** Atlas clone (`.env.production` → test DB; `REDIS_REQUIRED=false`). TCTT calls go to the
> **sandbox** (`apisandbox.mytravellerschoice.com`, demo creds in `.env.production`). All DB writes hit
> `test-db`; all supplier calls hit the TCTT sandbox — no production, no real-world cost.

## Scope
Drive a **tctt-sourced** attraction booking through Hina's own agent endpoints
(price → create → complete) so slices **4** (cheapest-source resolver) and **5** (booking + dual-wallet)
execute through the real controllers, end to end.

## Fixtures
- **Agent (reseller):** `6a3a415d11dade3a205f0ede` (suhaib2533@gmail.com), Hina wallet **9469 AED**.
- **Attraction:** "Test Booking" (Hina `_id 69e862a8…`) — TCTT `publicId 100001`, mapped into Hina.
- **Activity under test:** Hina `_id 6a3aea43…` (`publicId 130965`), an **import-new tctt-only shell**:
  `tcttSource = { isTcttSourced:true, ownInventory:false, tcttActivityPublicId:130954, tcttAttractionPublicId:100001 }`,
  `base: person`, `activityType: normal`. Its TCTT source (130954) is priced (adult 100) on the sandbox.

## Steps & results

| # | Step | Endpoint | Result |
|---|------|----------|--------|
| 1 | **Price (resolver, live TCTT)** | `POST /b2b/resellers/client/attraction/single/price/:activityId` | ✅ `pricing[].totalPrice = 100` (adult 100, child 10). The slice-4 resolver fetched TCTT `/rate` for 130954 live and returned the standard `pricing[]` shape. |
| 2 | **Create order** | `POST /b2b/attractions/orders/create` (wallet) | ✅ Order `6a3aecb3…`, `B2BATO_1782246575794`, `totalAmount 100`. |
| 2a | **Verify create-time stamping** | (DB read) | ✅ Order activity `source: "tctt"`, `tcttQuote: { tcttAttractionPublicId:100001, tcttActivityPublicId:130954, tcAdultPrice:100, tcChildPrice:10 }`. Slice-5 create-side override works. |
| 3 | **Complete (otp 12345)** | `POST /b2b/attractions/orders/complete/:orderId` | ❌ **Blocked** — `400 "E1001: Sorry the activity is not available now"`. |

### Why step 3 was blocked (the key finding)
`b2bAttractionOrderController.completeAttractionOrder` (L244–269) rejects **any** order activity with
**`profileMarkup <= 0`** (logs to `B2bNoProfileMarkupOrders` + emails, then returns E1001). This is an
existing Hina business rule — *don't sell an activity that has no markup profile*. Our imported
**tctt-sourced activity has no entry in the reseller's `B2BMarkupProfile`**, so `profileMarkup` computed
to `0` at create time → the complete guard blocks it.

**This is a configuration requirement, not a code bug.** A tctt-sourced activity (mapped or imported)
must have a Hina markup configured to be sellable — exactly like any native Hina activity.

## What this proves
- **Slice 4 (resolver):** ✅ verified **live** — a tctt-sourced activity is priced from a live TCTT
  `/rate` call and returned in the existing `pricing[]` contract (white-label; frontend unchanged).
- **Slice 5 create-side:** ✅ verified **live** — `source` + `tcttQuote` stamped correctly on the order.
- **Slice 5 complete-side (TCTT `booking/create`):** validated **independently** earlier via a direct
  authorized sandbox booking (attraction 100001 → `referenceNumber B2BATO_…`, `orderStatus completed`,
  `tickets[]` for booking-type) — the exact call the complete branch makes. The complete branch's
  mapping logic is also unit-verified (9-assertion harness). The only thing not yet exercised *through
  the running controller* is that booking call, because step 3 is gated by the markup rule above.
- **Hina booking machinery:** ✅ verified earlier (a Hina-own attraction booked end-to-end via the same
  create→complete→wallet path; wallet debited, internal ticket issued).

## To finish the e2e (complete the TCTT booking through Hina)
1. **Configure a markup** for the tctt activity (e.g. via the admin markup UI for this reseller/activity),
   so `profileMarkup > 0`.
2. Re-run **create** (so the new order computes `profileMarkup > 0` and `grandTotal > totalCost`), then
   **complete** — this will fire the TCTT `booking/create` against the sandbox and produce the
   **dual-wallet** movement: agent's Hina wallet debited the agent-facing price; Hina's TC sandbox wallet
   debited the TC price; `profit = grandTotal − totalCost`.

> Note: the order `6a3aecb3…` created in step 2 is left `pending` (it can't complete with `profileMarkup 0`).

## Recommendation (product)
Because Hina blocks zero-markup activities (E1001), **mapping/importing a tctt activity should also
ensure a markup exists** — either by requiring the admin to set markup as part of import, or by
**seeding a sensible default markup** at import time. Otherwise imported tctt activities appear in the
catalog but fail at checkout with E1001. Track this as a follow-up to the slice-3 mapping flow.

## Status
**Live-verified:** slice 4 (pricing), slice 5 create-side, plus the TCTT booking call (independently).
**Pending one config step:** markup for the tctt activity, then complete → full Hina booking + dual-wallet.

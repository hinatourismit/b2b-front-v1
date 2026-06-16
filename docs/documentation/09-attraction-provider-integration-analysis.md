# Attraction Third-Party Provider Integration — Backend Analysis

> Created 2026-06-16. Scope of an updated rule: the **attraction module of `api-server-main`**
> may be modified to add a new third-party API, **with zero change to any existing feature**.
> This document maps the current provider-integration architecture so a new provider can be
> added by following the established pattern exactly. No code changed yet — analysis only.

---

## 1. How attractions are sourced today

An attraction can be either **internal** (priced/booked from the platform's own DB inventory)
or **API-connected** (live data + booking from an external supplier). This is controlled by:

### On `Attraction` (`models/attraction/attraction.model.js`)
| Field | Meaning |
| --- | --- |
| `isApiConnected: Boolean` (required) | true → this attraction is served by an external supplier |
| `connectedApi: ObjectId` (required when `isApiConnected`) | points to an **`ApiMaster`** doc (the provider config). **No `ref`** in schema — resolved manually. |
| `bookingType: "booking" \| "ticket"` | booking = date/slot reservation; ticket = e-ticket inventory |

### On `AttractionActivity` (`models/attraction/attractionActivity.model.js`)
| Field | Meaning |
| --- | --- |
| `productId`, `productCode` | the supplier's product identifiers for this activity |
| `skuNo` | supplier SKU |
| `isApiSync: Boolean` | true → book this activity through the supplier API at order time |
| `isReference: Boolean` | used by Parmar branch to decide booking path |
| `isTimeSlot: Boolean` + `timeSlots[]` | activity needs a supplier timeslot lookup |
| `base: person \| private \| hourly \| hourly-vehicle`, `activityType: normal \| transfer` | pricing model |

### Provider config — `ApiMaster` (`models/settings/apiMaster.model.js`)
`{ apiCode, apiName, demoUrl, demoUsername, demoPassword, demoAgentId, liveUrl, liveUsername,
livePassword, liveAgentId, runningMode: "demo"|"live", type: "attraction"|"visa"|"hotel"|"flight",
isActive, vendorId }`.
A new attraction provider = a new `ApiMaster` doc with `type:"attraction"`; its `_id` becomes the
`connectedApi` on the attractions it serves.

---

## 2. Existing providers (the pattern is hardcoded `connectedApi` IDs)

Provider selection is done by **comparing `connectedApi.toString()` to hardcoded ObjectId strings**
scattered across controllers and helpers (not a registry/strategy map). The current set:

| connectedApi `_id` | Provider | Helper(s) | Log model |
| --- | --- | --- | --- |
| `63fca7219541a2dedef30ae5` | **Dubai Parks (DPR)** | `admin/helpers/attractionApiHelper.js` (`attractionApi`, `getBalance`), `admin/helpers/dubaiParkAuth.js`, `createDubaiParkOrder` | `dubaiParkLog` |
| `63f0a47b479d4a0376fe12f4` | **Burj Khalifa** | `admin/helpers/burjKhalifaApiHelper.js`, `burjKhalifaApiV2Helper.js` | `burjkhalifaLog` |
| `66c7344752a4f9c1fa366c12` | **Parmar** | `admin/helpers/parmarApiHelper.js` | `parmarLog` |
| (partial) | **Ottila** | `models/Ottila/` (only `OttilaCountry` so far) | — |

Auth/credentials: Dubai Parks reads from **env vars** (`DPR_USERNAME`, `DPR_PASSWORD`,
`DPR_BASE_URL`, `DPR_SUBSCRIPTION_KEY`) — the `ApiMaster`-based credential lookup is commented out
in `dubaiParkAuth.js`. Parmar reads its base URL/creds inside `parmarApiHelper.js`. **A new
provider will likely follow the env-var credential approach unless told otherwise.**

---

## 3. Provider helper template — Parmar (the cleanest full lifecycle)

`admin/helpers/parmarApiHelper.js` is the model to copy for a full integration. Exports:
- `getParmarAgentDetails()` — agent/balance
- `getParmerActivityList()` — product catalog
- `getSingleParmerActivity(isReference, productId, productCode)` — single product
- `getTimeSlotWithParmerRates({ date, productId, productCode, activity, name })` — slots + live price
- `getTicketTypeParmar(...)` — ticket types/prices
- `saveTicketParmar(...)` — hold/save booking (returns temp reference)
- `confirmTicketParmar(...)` — confirm booking (returns PNR/booking ref + ticket numbers)
- `getTicketInventoryTypeParmar(...)` / `confirmTicketInventoryParmar(...)` — e-ticket (bookingType "ticket") variant

Each function POSTs to `${url}/api/v1/<endpoint>` with credentials. The provider's two booking
modes map to `bookingType`: **"booking"** (date reservation → save then confirm) vs **"ticket"**
(inventory e-tickets → confirm inventory).

---

## 4. Integration touchpoints — every place `connectedApi` is branched

A new provider must add a case at each of these flows (each currently an `if/else if` chain on the
hardcoded id). File · function · approx line:

### Catalog / availability sync (admin-managed)
- `admin/helpers/attractionApiHelper.js` → `attractionApi(apiId)` returns the supplier product list (Dubai Parks `resellerProducts`). Used to refresh live product data.

### Detail page (live data + per-activity pricing)
- `b2b/controllers/attraction/b2bClientAttractionController.js`
  - `getSingleAttraction` (~L162): if connectedApi == DPR → `dubaiParkData = await attractionApi(...)`, passed into pricing.
  - `getSingleActivityPrice` (~L846–857): branches for DPR and Parmar.
- `b2b/helpers/attraction/b2bAttractionHelper.js`
  - `activitySinglePriceDetails({ ..., connectedApi, isApiConnected, dubaiParkData })` (~L132–260): **central pricing engine**; `isSingle && connectedApi == DPR` branch (~L202). This computes `lowPrice` + `pricing[]` (the array the frontend renders, with `transferType`/`totalPrice`/`privateTransfers`).

### Timeslots
- `b2b/helpers` → `getTimeSlot`, `getTimeSlotWithRate` (internal) and
  `admin/helpers/parmarApiHelper.js` → `getTimeSlotWithParmerRates`, plus Burj Khalifa V2 helper.
  Entry: `b2bClientAttractionController` timeslot endpoint.

### Order create / supplier booking (the critical write path)
- `b2b/helpers/attraction/b2bAttractionOrderHelper.js` (~L585–800, also ~L1469): big `if/else if`
  on `activity.attraction.connectedApi` **&&** `isApiConnected` **&&** (`isApiSync` or `isReference`):
  - DPR (`63fca7…`): `createDubaiParkOrder(...)` → maps `MediaCodeList` to adult/child tickets, `PNR` → `bookingConfirmationNumber`, status `confirmed`; on error status `failed` + throw.
  - Burj Khalifa (`63f0a47b…`): generates voucher number, calls confirm.
  - Parmar (`66c73447…`) bookingType "booking": `confirmTicketParmar(...)`.
  - Parmar (`66c73447…`) bookingType "ticket": `confirmTicketInventoryParmar(...)`.
  - `else`: internal inventory booking (issues tickets from platform DB).
- `b2b/helpers/attraction/b2bAttractionSubOrderHelper.js` (~L692): sub-order/ticket branch.
- `b2b/controllers/attraction/b2bAttractionOrderController.js` (~L848): order controller branch.

### Tickets / vouchers
- `b2b/helpers/attraction/b2bAttractionTicketHelper.js`, `createMultipleTicketTheme2/3.js`,
  provider ticket numbers stored on `attractionOrder.activities[i].adultTickets/childTickets`.

### Cancellation / refund
- order cancel path in `b2bAttractionOrderController` / order helper (per-provider cancel call where supported).

### B2C + Admin-B2B parallels (must also be considered for parity, but our frontend only uses B2B)
- `controllers/attraction/attractionsController.js` / `attractionsOrdersController.js` (B2C) mirror the same branches (~L580–591).
- `admin-b2b/controllers/attraction/admBookingClientAttractionController.js` also imports `attractionApi`.

---

## 5. Order model fields the booking flow writes
`models/attraction/attractionOrder.model.js` (and `b2b/models/attraction/b2bAttractionOrder.model.js`)
store per-activity: `status` (pending/booked/confirmed/failed/cancelled), `bookingConfirmationNumber`,
`bookingReferenceNo`, `tempReference`, `adultTickets[]`/`childTickets[]` (`ticketNo`, `lotNo`,
`ticketFor`, `ticketCost`, `status`), `isApiSync`, `productId`, `productCode`, `profit`,
`totalCost`, `grandTotal`. A new provider's booking response must be mapped onto these same fields.

---

## 6. Integration plan for the NEW provider (once its API is known)

Following the established pattern with zero disruption:

1. **Config**: create an `ApiMaster` doc (`type:"attraction"`) for the provider → get its `_id`
   (the new `connectedApi`). Add credentials (env vars, mirroring DPR/Parmar).
2. **Helper**: add `admin/helpers/<provider>ApiHelper.js` exporting the lifecycle functions the
   provider supports (auth, productList, single, timeslot+rates, ticket-type, save, confirm,
   cancel) — Parmar helper as the template. Add a `<provider>Log` model + log helper for parity.
3. **Branches** (add a NEW `else if (connectedApi == "<newId>")` case — never modify existing
   branches): detail/`getSingleAttraction`, pricing/`activitySinglePriceDetails`, timeslots,
   **order create** in `b2bAttractionOrderHelper.js`, tickets, cancel. Mirror in B2C/admin-b2b
   only if those surfaces serve this provider's attractions.
4. **Mapping**: convert the provider's responses to the existing `pricing[]` shape (frontend
   contract — see `07-attractions-contract.md`) and order ticket fields (§5). The frontend needs
   **no changes** if the mapping matches the existing shapes.
5. **Markup**: API-connected prices still pass through `applyMarkup` / `resolveProfileActivityMarkup`
   exactly like existing providers — do not bypass markup.

---

## 7. Hard preservation rules (no existing feature may change)

- Add new `else if` branches keyed on the **new** `connectedApi` id; **do not edit** the DPR /
  Burj Khalifa / Parmar branches or the internal `else`.
- Keep the existing pricing `pricing[]` output shape, ticket field mappings, order statuses, and
  markup application identical.
- Internal (non-API) attractions and the three existing providers must behave byte-for-byte as now.
- No change to routes, response envelopes, or field names the frontend already consumes
  (`07-attractions-contract.md`).
- New env vars/config are additive.

---

## 8. What's needed to implement (the new API's spec)

To write the provider helper + branches I need, for the new third-party API:
1. **Provider name** and what it covers (catalog? single product? live pricing? timeslots?
   booking? e-tickets? cancellation?).
2. **API documentation / endpoints** (base URLs demo + live, paths, methods).
3. **Auth method** (API key / basic / token; where credentials live — env vs ApiMaster).
4. **Request/response samples** for: product/availability, price, timeslot (if any),
   save/confirm booking, ticket retrieval, cancellation.
5. Which **attraction(s)/activities** it serves (so the `connectedApi` + `productId/productCode`
   can be set), and `bookingType` (booking vs ticket).
6. Whether it should be **B2B only** (our scope) or also B2C/admin-b2b.

With those, the integration is mechanical: one ApiMaster doc, one helper module, and additive
`else if` branches at the §4 touchpoints — preserving everything else.

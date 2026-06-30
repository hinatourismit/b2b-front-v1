# TCTT-API-V1 Attraction Integration — Contract & Plan

> Created 2026-06-21. Integrate Travellers Choice's external attraction catalog API
> (`api-out-attraction-v1-main`, "TCTT-API-V1") into Hina Tourism **white-label**: Hina's
> customers must never know the inventory is sourced from TC. Hina's backend is its own
> deployment of `api-server-main`; Hina is a **reseller account on TC** and **consumes** this API.
> This integration uses the scoped attraction-module exception (additive only; preserve all
> existing features).

---

## 1. What TCTT-API-V1 is

Standalone TS service that connects directly to TC's MongoDB and exposes TC's whole attraction
catalog as a **token-authenticated, wallet-settled partner API**. Unlike Burj Khalifa / Dubai
Parks (single-attraction `connectedApi` branches), it serves the **entire multi-attraction catalog**
through one API. IDs are numeric **`publicId`** (not Mongo `_id`).

### Auth (2-step)
1. `GET /api/v1/client/tokens/generate` — header `api-key: <key>` → `{ access_token, expiryDate }`.
   Token = 32-byte hex, valid **10 days**, stored per-reseller on `ApiOutInfo`.
2. All other calls: `Authorization: Bearer <access_token>`. Middleware resolves the reseller,
   checks `config.showAttractionApi`, plus a per-reseller-per-endpoint `hasAccess` flag
   (`AttractionSyncInfo`; TC can revoke individual endpoints).

### Envelope
OK → `{ success: true, data }` · Error → `{ success: false, errors: [{ error, message }] }` with real
HTTP status codes (400/401/404/409/500).

### Endpoints (base `/api/v1`)
| Method · Path | In | Out (`data`) |
| --- | --- | --- |
| `GET /attraction/list?page=N` | 1-based page, limit 100 | `{ totalAttractions, attractions:[{attractionId, title, attractionType, durationType, duration, latitude, longitude, cancellationType, adultLowPrice, childLowPrice}], skip, limit }` |
| `GET /attraction/min-rate` | — | lighter list with low prices |
| `POST /attraction/details` | `{ attractionIds:[number] }` (≤10) | `{ attractions:[{attractionId, title, attractionType, durationType, duration, lat/long, cancellationType, googleMapLink, videoLink, images[], logo, inclusion, faq:[{question,answer}]}] }` |
| `POST /attraction/availability` | `{ attractionId, date? }` | `{ attraction:{ attractionId, title, attractionType, activities:[{activityId, date, activityName, activityType, isTimeSlot, isActive, adultAgeLimit, childAgeLimit, adultTicketAvailable, childTicketAvailable, adultPrice, childPrice}] } }` (sorted by adultPrice) |
| `POST /attraction/activity/rate` | `{ attractionId, activityId, date }` | single-activity price (same activity fields) |
| `POST /attraction/activity/timeslot` | `{ attractionId, activityId, date }` | `[{ slotId, startTime, endTime, available, adultPrice, childPrice }]` — **creates 15-min holds** |
| `POST /attraction/activity/booking/create` | booking body ↓ | `{ orderStatus, referenceNumber, agentReferenceNumber, totalAmount, orderDetails:[{date, status, activityReferenceNumber, attractionId, attractionType, activityId, tickets:[{ticketNo, ticketFor}]}] }` |
| `POST /attraction/activity/booking/details` | `{ referenceNumber }` | same order shape |
| `GET /attraction/activity/ticket/download/:ref/:activityRef` | — | **PDF buffer** (needs account `eTicket` enabled) |

### Booking body
```jsonc
{
  "agentReferenceNumber": "<unique per reseller — idempotency key>",
  "name": "...", "email": "...", "country": "AE" /* 2-letter ISO */, "phoneNumber": "digits",
  "selectedActivities": [{
    "attractionId": <num>, "activityId": <num>, "date": "ISO",
    "adultsCount": <int>, "childrenCount": <int>, "infantCount": <int>,
    "adultPrice": <num>, "childPrice": <num>, "infantPrice": <num?>,
    "slotId": "<required if activity.isTimeSlot>"
  }]
}
```

### Booking semantics (these drive the architecture)
- **Synchronous & atomic** — one call validates → prices → wallet-checks → **debits wallet** →
  issues tickets / confirms supplier → returns confirmed tickets. No separate pay step.
- **Wallet-only** (hardcoded; ccavenue/tabby commented out). TC debits **Hina's TC-wallet** →
  Hina must **pre-fund a wallet with TC**.
- **Price echo-check** — `adultPrice`/`childPrice` sent at booking must equal TC's freshly computed
  (TC-account-marked-up, VAT-incl) price or booking is rejected ("price has been changed"). →
  Hina must echo the exact price from `/rate` or `/timeslot`.
- **`agentReferenceNumber` = idempotency key** (unique per reseller).
- Only **`activityType: "normal"`** is sold (transfers excluded, `transferType` forced "without").
  `bookingType` (`ticket` | `booking`) is transparent to the consumer (both return
  `orderDetails[].tickets[]`).
- **No cancellation endpoint** yet. Webhook (`POST /webhook`, HMAC `X-Signature`) + account
  `webhook_details` exist but are a stub (secret `"abcd"`).

Full source: `/Users/suhaib/Desktop/hina-tourism/api-out-attraction-v1-main`.

---

## 2. Locked decisions (2026-06-21)

| # | Decision | Choice |
| --- | --- | --- |
| Surface | Customer-facing separation | **White-label.** One attractions experience; merge happens in Hina's **backend**; frontend stays single & source-agnostic. |
| Catalog | How TC inventory enters Hina | **Sync into a staging layer**, then **admin-curated mapping** into Hina's masters (§3a). Customer-visible records are Hina masters; existing listing/search/detail/orders endpoints return them natively — **zero frontend change for browsing**. |
| Markup | Pricing to Hina's agents | **Two layers.** TC keeps its account margin (TCTT returns TC-marked-up prices); Hina stacks its **own** markup on top via the existing markup engine. Hina ≠ TCTT — separate businesses, separate margins. |
| Dedupe | Same attraction in both Hina & TCTT | **Admin mapping.** Admin maps a TCTT attraction/activity to an existing Hina one (collapse → one customer-facing record) or imports as new. Per-activity granularity. |
| Source resolution | Mapped activity has 2 sources | **Cheapest at request time.** Compare the two **agent-facing** prices (source cost + Hina markup) live; serve the lower; re-resolve at booking. |
| Visibility | Unmapped synced records | **Hidden until admin maps/approves.** Staging records are not customer-visible until mapped to an existing master or imported as new. |
| Admin UI | Where mapping/sync tooling lives | User's **separate admin panel repo** (to be added to the workspace). Build backend admin API **and** the admin screens. |

### Consequence of two-layer markup — dual price tracking
Per TC activity, Hina carries:
- **TC price** (TC margin; from `/rate` or `/timeslot`) → echoed back to TCTT at booking; what TC
  debits from Hina's TC-wallet. Stored as **cost**.
- **Agent-facing price** = TC price **+ Hina markup** → shown to agent; charged to agent's
  Hina-wallet. Stored as **price**.
- Delta = **Hina profit**. Maps onto the existing order model's price/cost/markup/profit fields.

---

## 3. Architecture

**Frontend:** no change for browse/search/detail/orders — they simply begin to include TC records.
Only thing to watch: detail-page pricing/availability/timeslot for a TC record resolves live (below),
but the frontend calls the same Hina endpoints regardless.

**Backend (Hina `api-server-main`, additive):**

1. **Token + client module** — `attraction-tctt` consumer: api-key → bearer cache, auto-refresh on
   expiry/401; typed wrappers for the 9 endpoints; unwrap `{success,data}`; map errors.
2. **Catalog sync job** — pulls `/attraction/list` (paged) + `/attraction/details` (≤10 ids/call) and
   upserts Hina `Attraction` + `AttractionActivity` records flagged `source=tctt`, storing
   `tcttPublicId` (attraction + per-activity), `isApiActive`, content (images/logo/inclusion/faq),
   `bookingType`, `isTimeSlot`. Scheduled (e.g. nightly) + on-demand admin trigger. Content only —
   **prices are never synced** (always live).
3. **Source-aware branches** (the only source-aware code) at:
   - **availability / activity rate** → call TCTT `/availability` `/activity/rate`; map to the
     existing activity-price shape the frontend already consumes. TC price stored as cost; Hina
     markup applied on top for the agent-facing number.
   - **timeslot** → TCTT `/activity/timeslot`; pass through `slotId` (opaque to frontend).
   - **booking** → §4.
   - **order detail / ticket download** → if order tagged `tctt`, read from Hina's stored TC refs /
     proxy `/ticket/download`.
4. **Orders unified** — TC bookings are written into Hina's existing attraction-order model (tagged
   `source=tctt`, storing TC `referenceNumber` + `activityReferenceNumber`s + tickets). The existing
   `/attraction/order` list, invoice, and ticket download render them with no UI special-casing.

---

## 3a. Catalog mapping & source resolution

Three layers (refines §3 "sync" into a curated pipeline):

1. **Staging (synced mirror)** — `TcttAttraction` / `TcttActivity`: raw import of TCTT's catalog
   (`publicId`, content, `isApiActive`, `lastSyncedAt`). The admin **Sync** action refreshes it.
   Pull via `/attraction/list` (paged) + `/attraction/details` (≤10 ids/call).
2. **Mapping** — per staging record: `mappingStatus` = `unmapped | mapped | imported-as-new` + link to
   the Hina record. Admin either **maps to an existing Hina attraction/activity** (dedupe → collapse to
   one customer-facing record) or **imports as new** (create a fresh Hina master, `source=tctt`).
   Granularity is **per-activity**: one mapped attraction may have some activities in both (deduped) and
   some TCTT-only (additive under the same attraction).
3. **Canonical master** — Hina `Attraction` / `AttractionActivity` is what the customer sees.
   A Hina activity records its candidate **sources**: `own` and/or `tctt` (with `tcttPublicId`).

**Visibility:** only mapped / imported-as-new records are customer-visible. Unmapped staging records
never reach the catalog.

**Source resolution (cheapest at request time):** for a Hina activity with **both** sources, on each
price/availability request compute both **agent-facing** prices — `own` = Hina cost + Hina markup;
`tctt` = TC price (TC margin, live from `/rate` or `/timeslot`) + Hina markup — and serve the **lower**.
Re-resolve at booking and route to the winning source (echo TC's price if TCTT wins; existing flow if
own wins). Consequences to handle:
- **Listing performance** — listing uses `adultLowPrice` for *many* attractions; do **not** fan out a
  live TCTT call per activity. Use synced low-price hints from staging (`/list` / `/min-rate`) for the
  listing compare; do the **live** compare on detail + at booking.
- **Price drift** — the cheapest source (and the price) can change between detail view and checkout.
  Reuse the existing price-recheck pattern; if the resolved source/price changes, re-confirm with the
  agent before charging.
- Single-source activities (own-only or tctt-only) skip resolution.

## 4. Booking & wallet flow (TC-first — recommended, pending final sign-off)

Two wallets: Hina's wallet **on TC** (debited by TCTT) and the agent's wallet **in Hina**.

1. Validate agent's Hina-wallet ≥ **agent-facing** grand total.
2. `POST` TCTT `booking/create` with **TC prices** (echo-checked) + `agentReferenceNumber` =
   Hina's unique order ref (idempotent). TC validates, debits **Hina's TC-wallet**, issues tickets.
3. TC fails → abort; agent charged nothing; surface message.
4. TC succeeds → write Hina order (tagged `tctt`, TC refs/tickets, cost=TC, markup=Hina, profit),
   **then** debit agent's Hina-wallet, mark `completed`.
5. Rare edge (TC confirmed, Hina post-step fails) → order `settlement-pending`; reconcile job
   settles agent wallet. Internal money, low frequency.
6. Operational (not code-blocking): Hina ops pre-funds the TC-wallet + low-balance alert.

---

## 5. Build slices

1. **Token + client module** + config (demo creds) — no writes.
2. **Staging + sync** — `TcttAttraction`/`TcttActivity` models + sync job (list + details upsert). Admin API.
3. **Admin mapping** — list staging, map to existing / import-as-new, per-activity, source links. Admin UI
   (in the admin repo, once added). After mapping, mapped/new records appear in the existing catalog.
4. **Live availability / rate / timeslot** + **cheapest-source resolution** + Hina markup on top.
5. **Booking + dual-wallet** flow (re-resolve cheapest, route to winning source) + unified order write.
6. **Order detail / invoice / ticket download** for `tctt` orders.
7. Polish, reconcile job, low-balance alert, (later) cancellation + webhook when TC exposes them.

Slices 1–4 are buildable/verifiable read-only. Slices 5–6 (writes) wait on a **demo backend** so we
never touch production (see no-production-writes).

---

## 5a. Implementation status

**Slice 1 — DONE** (in `api-server-main`, additive; syntax + config-logic verified, no live calls):
- Staging models: `models/attraction/tcttAttraction.model.js`, `tcttActivity.model.js`,
  `tcttApiLog.model.js` (registered in `models/index.js`).
- Consumer client: `admin/helpers/tctt/` — `tcttConfig.js` (env resolver, demo/live),
  `tcttClient.js` (token cache + auto-refresh + one auth-retry; typed wrappers for all 9 endpoints;
  best-effort `TcttApiLog`), `index.js`.
- Env required before any live call: `TCTT_RUNNING_MODE` (demo|live), `TCTT_DEMO_BASE_URL`,
  `TCTT_DEMO_API_KEY` (+ `TCTT_LIVE_*`). Importing the module is safe without them; a call throws a
  clear "not configured" error.

**Slice 2 — DONE** (in `api-server-main`, additive; module graph loads, sync **logic** runtime-verified
via a mock-client + in-memory-model harness — pagination, details-chunking, activity enumeration,
mapping-preservation on re-sync, scoped soft-delete; **live** sync still pending demo creds + DB):
- Sync helper: `admin/helpers/tctt/tcttSyncHelper.js` → `syncTcttCatalog()`. Pages `/attraction/list`,
  chunks `/attraction/details` (≤10), enumerates activities via `/attraction/availability` (today).
  Upserts staging by `tcttPublicId`; **preserves admin mapping** (`mappingStatus`/`hina*` set only on
  insert); soft-deletes records TC no longer returns (activity soft-delete scoped to attractions whose
  availability succeeded, so an availability error never falsely deletes). Returns a summary
  `{ dryRun, limit, softDeleteSkipped, durationMs, attractions:{total,new,updated,removed}, activities:{...}, errorCount, errors }`.
  **Safety options** `syncTcttCatalog({ dryRun, limit })` (also via `POST /sync` body): `dryRun`
  classifies new/updated + counts would-removes but performs **no writes**; `limit` caps attractions
  processed and **never soft-deletes** (a bounded run hasn't seen the rest of the catalog). Verified by
  harness (9 assertions). Use these to preview/bound a real sync against the LIVE DB (no-production-writes).
- Admin controller: `admin/controllers/attraction/admTcttController.js` — `syncTcttCatalog`,
  `getTcttAttractions` (filter by mappingStatus/search, paginated), `getTcttAttraction` (by `_id` or
  `tcttPublicId`, + its activities).
- Routes: `admin/routes/attraction/admTcttRouter.js`, barrel-registered, mounted at
  `/attractions/tctt` (before the generic `/attractions`, behind `adminAuth`):
  `POST /attractions/tctt/sync`, `GET /attractions/tctt/attractions`, `GET /attractions/tctt/attractions/:id`.
  Full path under `/api/v1/admin`.

**Slice 3 — DONE** (backend + admin UI): see `11-tctt-mapping-endpoints.md` (§6a). Backend markers +
map/import/unmap endpoints (mock-DB verified, 19 assertions); admin UI in `admin-front-main`
(TCTT Catalog list + sync, attraction detail with map/import/unmap, route + sidebar; production build
verified). Live end-to-end still pending demo creds.

**Slice 4 — DONE** (see `12-tctt-source-resolver.md` §9a): cheapest-source resolver + `tcttCost` engine
override; all 3 pricing touchpoints wired (price-recheck, detail, timeslot); fallback-to-own on TCTT
failure; 60s cache (bypassed at booking). Logic verified (7-assertion harness).

**Slice 5 — DONE** (booking + dual-wallet; logic verified, 9-assertion harness; live e2e pending):
- Order model (`b2bAttractionOrder`): additive `source`, `slotId`, `tcttQuote`.
- Create (`b2bAttractionOrderHelper2`): tctt-sourced activities re-resolve cheapest live (noCache); if
  tctt wins, the TC price becomes the base cost (markup math → two-layer) and `source`+`tcttQuote` are
  stamped on the order activity.
- Complete (`b2bAttractionOrderHelper.attractionOrderCompleteHelper`): new branch keyed on
  `source==="tctt"` calls `tcttClient.createBooking` (echoes exact TC price, ISO country,
  `activityReferenceNumber` as idempotency key), maps tickets, sets confirmed, profit = grand−cost.
  Runs **before** the agent-wallet debit (controller order) → TC-first: TCTT failure ⇒ agent not
  charged. **Dual-wallet**: TCTT debits Hina's TC wallet; the controller debits the agent's Hina
  wallet for the agent-facing total; the delta is Hina profit.
- Live e2e still needs: a mapped tctt activity in test-db + one sandbox booking.

## 6. Open items

- **#2 wallet** — final sign-off on TC-first flow + the `settlement-pending` reconcile.
- **#4 credentials** — demo base URL + api-key (and: is `eTicket` enabled on the demo account? is the
  demo TC-wallet funded for booking tests?). **Blocks any live call**, including read-only catalog sync.
- **Admin panel repo** — to be added to the workspace before slice 3's admin UI.
- **Cheapest comparison basis** — confirmed agent-facing price (source cost + Hina markup). Listing uses
  synced low-price hints; detail/booking use live compare.
- Sync cadence + which content fields are authoritative on re-sync.

# TCTT Integration — Slice 3: Admin Mapping Endpoints (design)

> Created 2026-06-21. Design for the admin-curated mapping that turns TCTT **staging**
> records (`TcttAttraction`/`TcttActivity`, from slice 2) into customer-visible Hina masters.
> Backend endpoints live in `api-server-main` admin module; the admin **UI** consumes them
> (user's separate admin panel repo, to be added). Builds on doc 10 §3a. **Design only — not
> yet implemented.**

---

## 1. The two ways a staging record becomes visible

Per doc 10: unmapped staging records are hidden. An admin makes one visible by either:

- **Map to existing** — the same real-world attraction already exists as a Hina master. Link
  `TcttAttraction → Attraction`, then per-activity link `TcttActivity → AttractionActivity`
  (dedupe). The mapped Hina activity now has **two sources** (own + TCTT) → cheapest-resolved.
- **Import as new** — no Hina equivalent. Create a fresh Hina `Attraction` + `AttractionActivity`
  records from the staged content. These are **TCTT-only** (no own inventory).

Mapping is **per-activity**, so a mapped attraction can mix: some activities deduped (own + tctt),
some imported-as-new under it (tctt-only, additive).

---

## 2. Runtime marker on the Hina master (the key design decision)

The staging link (`TcttActivity.hinaActivity` + `mappingStatus`) is enough for **admin/sync**
bookkeeping, but slices 4–5 and the **existing** attraction order flow need to recognize a
TCTT-sourced activity **without a join**, at price/booking time. So mapping also writes an
**additive marker** onto the Hina master:

**`AttractionActivity` (additive subdoc `tcttSource`):**
```js
tcttSource: {
    isTcttSourced: { type: Boolean, default: false },
    // true  → activity also has its OWN inventory (mapped-to-existing) → cheapest(own, tctt)
    // false → TCTT-only (imported-as-new) → always TCTT
    ownInventory:  { type: Boolean, default: false },
    tcttActivityPublicId:    { type: Number },
    tcttAttractionPublicId:  { type: Number },
}
```

**`Attraction` (additive):** `tcttSourced: { type: Boolean, default: false }` — true only for
**imported-as-new** attractions (a native Hina attraction that merely has some tctt-linked
activities is NOT flagged; only its activities carry `tcttSource`).

Why a marker and not just the staging join:
- **Cheapest resolver (slice 4)** reads `activity.tcttSource` directly — `ownInventory` decides
  own-vs-tctt-only vs both.
- **Booking branch (slice 5)** routes `isTcttSourced` activities to the TCTT/dual-wallet flow.
- **Existing internal order helper** must **skip** `tcttSource.isTcttSourced && !ownInventory`
  activities (a tctt-only shell has no internal tickets) — a one-line guard, additive.

Both the marker and the staging link are written together in every mutation (kept consistent).

> ✅ **Locked (§6): dedicated `tcttSource` fields** — not `isApiConnected`/`connectedApi` (those drive
> the existing Burj/DPR/Parmar booking branches; an unknown `connectedApi` would fall through to
> internal-inventory booking — wrong for TCTT).

---

## 3. Endpoints

All under `/api/v1/admin/attractions/tctt/` (behind `adminAuth`), alongside the slice-2 reads.

### 3.1 Map a staging attraction to an existing Hina attraction
`POST /attractions/:id/map`  (`:id` = staging `_id` or `tcttPublicId`)
```jsonc
{
  "hinaAttractionId": "<Attraction _id>",
  "activityMappings": [
    { "tcttActivityId": 1001, "action": "map",        "hinaActivityId": "<AttractionActivity _id>" },
    { "tcttActivityId": 1002, "action": "import-new" },   // additive tctt-only activity under hina attraction
    { "tcttActivityId": 1003, "action": "skip" }          // leave unmapped/hidden
  ]
}
```
Effect:
- `TcttAttraction`: `mappingStatus="mapped"`, `hinaAttraction=hinaAttractionId`.
- `action:"map"` → `TcttActivity.mappingStatus="mapped"`, `hinaActivity=hinaActivityId`; set that
  `AttractionActivity.tcttSource = { isTcttSourced:true, ownInventory:true, tctt*PublicId }`.
- `action:"import-new"` → create `AttractionActivity` under `hinaAttractionId` from staged content
  with `tcttSource={ isTcttSourced:true, ownInventory:false, … }`; `TcttActivity` →
  `"imported-as-new"`, `hinaActivity=<newId>`.
- `action:"skip"` → no-op (stays `unmapped`).
- Returns the updated staging attraction + activities (mapping statuses + hina links).

### 3.2 Import a staging attraction as a new Hina attraction
`POST /attractions/:id/import`
```jsonc
{
  "destinationId": "<Destination _id>",      // required — TCTT doesn't supply it
  "categoryId":    "<AttractionCategory _id>", // required
  "overrides": { /* optional: bookingPriorDays, availability, isCombo, ... */ }
}
```
Effect:
- Create `Attraction` (`tcttSourced:true`) from staged content (title, images, logo, inclusion→
  highlights, faq, attractionType→bookingType, durationType, duration, cancellationType, lat/long,
  mapLink, videoLink) + admin-supplied required fields + sensible defaults (§5).
- Create one `AttractionActivity` per staged activity with `tcttSource={isTcttSourced:true,
  ownInventory:false,…}`.
- `TcttAttraction`→`"imported-as-new"`, `hinaAttraction=<newId>`; each `TcttActivity` likewise.
- Returns the created Hina attraction id + activity ids.

### 3.3 Unmap
`POST /attractions/:id/unmap`
- `mapped` → clear `TcttAttraction`/`TcttActivity` links back to `"unmapped"`; remove `tcttSource`
  from the deduped Hina activities; **delete the additive import-new shells** created under the
  existing attraction (those are tctt-only). The native Hina attraction itself is untouched.
- `imported-as-new` → remove the created Hina `Attraction` + its `AttractionActivity` shells; staging
  back to `"unmapped"`.
- **Guard (locked §6):** if any created shell / mapped activity is referenced by an existing order,
  **deactivate** (`isActive=false` / hidden) instead of hard-delete, and report it. Hard-delete only
  order-free shells.

### 3.4 Per-activity mutations (incremental, post-attraction-map)
`POST /activities/:tcttActivityId/map` `{ action:"map"|"import-new", hinaActivityId? }`
`POST /activities/:tcttActivityId/unmap`
For adjusting one activity (e.g. a newly-synced activity under an already-mapped attraction).

### 3.5 (Optional) Match suggestions
`GET /attractions/:id/match-suggestions` → fuzzy title/destination matches among Hina attractions +
their activities, to speed up dedupe in the UI. Nice-to-have; not required for correctness.

---

## 4. Validation & guards

- `hinaAttractionId` exists & not deleted; each `hinaActivityId` belongs to it.
- `tcttActivityId`s belong to the `:id` staging attraction.
- Reject re-mapping an already-mapped `TcttActivity` (unmap first); reject linking a Hina activity
  already linked to a different TCTT activity (1:1).
- Import: required `destinationId` + `categoryId`; reject if already `imported-as-new`/`mapped`.
- `activityType !== "normal"` staged activities are not mappable (TCTT only sells normal; transfers
  excluded) — surface as skipped with a reason.

---

## 5. Transactionality & required-field gap

- Each mutation touches **staging + master** together → wrap in a mongoose session/transaction where
  the deployment supports it (replica set); otherwise order writes master-first then staging, with a
  best-effort rollback on failure. (Confirm DB topology.)
- The Hina `Attraction`/`AttractionActivity` schemas have **required fields TCTT doesn't provide**
  (destination, category, durationInSeconds, isCombo, isCustomDate, availability, bookingPriorDays for
  `booking` type, …). Import must supply/derive these: admin-provided (`destinationId`, `categoryId`)
  + defaults (e.g. `isCombo:false`, `isCustomDate:false`, full-week `availability`, `isOffer:false`).
  The exact default set is finalized against the live `api-server-main` Attraction/Activity schema at
  implementation time (per [[exact-contract-fidelity]]).

---

## 6. Locked decisions (2026-06-21)

1. **Marker approach** — ✅ **dedicated `tcttSource`/`tcttSourced` fields** (§2). Do NOT reuse
   `isApiConnected`/`connectedApi` (would collide with the Burj/DPR/Parmar booking branches).
2. **Unmap with existing orders** — ✅ **deactivate-and-keep** (`isActive=false`/hidden), never
   hard-delete a record an order references; report what was deactivated. Hard-delete only shells
   with no order references.
3. **Import defaults** — ✅ admin form **always supplies `destinationId` + `categoryId`**; all other
   required Attraction/Activity fields are defaulted (e.g. `isCombo:false`, `isCustomDate:false`,
   full-week `availability`, `isOffer:false`, `durationInSeconds` derived from durationType+duration),
   finalized against the live `api-server-main` schema at implementation time.
4. **DB topology** — ✅ implement **defensively**: use a mongoose **session/transaction when a session
   is available** (replica set); otherwise **master-first then staging** with best-effort rollback on
   failure. No dependency on knowing the topology up front.

---

## 6a. Implementation status

**Backend — DONE** (in `api-server-main`, additive; logic runtime-verified via a mock-DB harness,
19 assertions: import/map/unmap-imported/unmap-mapped):
- Markers: `Attraction.tcttSourced`, `AttractionActivity.tcttSource{isTcttSourced,ownInventory,
  tcttActivityPublicId,tcttAttractionPublicId}` (additive).
- Helper: `admin/helpers/tctt/tcttMappingHelper.js` — `mapAttraction`, `importAttraction`,
  `unmapAttraction`, `mapActivity`, `unmapActivity`.
- Controller + routes (`/api/v1/admin/attractions/tctt/...`): `POST /attractions/:id/map|import|unmap`,
  `POST /activities/:tcttActivityId/map|unmap`.

Implementation realities resolved:
- **Ids** via the existing `publicCodeOrIdGeneration(collection)` + `savePublicIdOrCode` (counter).
- **`ticketPricing` is required** for normal activities, but tctt-only shells are priced live →
  store the **synced low-price hint as synthetic `ticketPricing`** (5-yr range); the slice-4 resolver
  overrides it live. Doubles as the listing "from" price.
- **Required-String defaults** (mongoose rejects `""`): `youtubeLink → videoLink||"N/A"`,
  `highlights → inclusion||"N/A"`; `isApiConnected:false` (TCTT booking via the new flow, NOT a
  connectedApi branch); `durationInSeconds` derived from durationType×duration; `bookingPriorDays:0`
  for booking type.
- Transfer-type staged activities are skipped (TCTT sells only `normal`).

**UI — DONE** in `admin-front-main` (Vite/React JSX, Redux, axios `/api/v1/admin`; production build
verified — pages compile, blocked only by the pre-existing missing gitignored `src/constants`):
- `src/pages/Attraction/TcttStagingListPage.jsx` — staging list, filter by mappingStatus + search,
  "Sync from TCTT" button, pagination, link to detail.
- `src/pages/Attraction/TcttStagingDetailPage.jsx` — attraction + activities; Import-as-new modal
  (destination + category selects), Map-to-existing modal (search Hina attraction → per-activity
  map/import-new/skip with Hina-activity select), Unmap. Uses real admin endpoints
  `/attractions/categories/all`, `/destinations/all`, `/attractions/all`, `/attractions/single/:id`.
- Routes added in `src/routes/Router.jsx` (`/attractions/tctt`, `/attractions/tctt/:id`, perm
  `attractions/view`); sidebar entry "TCTT Catalog" in `src/data/sidebarMenus.jsx`.

## 7. Feeds into

- **Slice 4** (cheapest resolution): reads `AttractionActivity.tcttSource` — `ownInventory` picks
  own-only / tctt-only / both(cheapest); listing uses staged low-price hints.
- **Slice 5** (booking + dual-wallet): `isTcttSourced` routes to the TCTT booking + dual-wallet flow;
  existing internal order helper skips tctt-only shells.

Related: [[tctt-api-v1-contract]], doc 10 §3a/§4, [[exact-contract-fidelity]].

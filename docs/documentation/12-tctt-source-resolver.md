# TCTT Integration — Slice 4: Cheapest-Source Resolver (design)

> Created 2026-06-21. The runtime layer that prices a Hina activity by choosing, per request,
> the cheaper of its sources (own inventory vs TCTT), white-label. Reads the `tcttSource` marker
> written by slice 3 (doc 11). Lives in `api-server-main`'s B2B attraction module (additive,
> attraction-exception). **Design only — not implemented; live verification needs demo creds.**

---

## 1. What it does

For a Hina `AttractionActivity`, source candidates come from its marker:

| `tcttSource` | Candidates | Behaviour |
| --- | --- | --- |
| absent / `isTcttSourced:false` | **own only** | existing Hina pricing path — **no change** |
| `isTcttSourced:true, ownInventory:true` (mapped-to-existing) | **own + tctt** | compute both, serve cheaper |
| `isTcttSourced:true, ownInventory:false` (imported-as-new) | **tctt only** | always TCTT (synthetic `ticketPricing` is ignored at runtime) |

"Cheaper" = lower **agent-facing** price (after Hina markup), per the locked decision. Re-resolved
at booking (slice 5).

---

## 2. Two-layer pricing math

Both candidates run through the **same** Hina markup pipeline; only the base cost differs:

- **own**: base cost = the activity's `ticketPricing` for the date (existing engine input).
- **tctt**: base cost = **live TC price** from TCTT `/activity/rate` (or `/activity/timeslot`),
  which already includes TC's reseller-account margin (two-layer: TC keeps its margin).

```
ownAgentPrice  = hinaMarkupPipeline(ownCost,   activity, reseller)   // profile + sub-agent + client + VAT
tcttAgentPrice = hinaMarkupPipeline(tcPrice,   activity, reseller)   // SAME pipeline, TC price as base
chosen = min(ownAgentPrice, tcttAgentPrice)  // per the booked pax mix
```

Reuse the existing `resolveProfileActivityMarkup` / `applyMarkup` + sub-agent + client markup +
VAT logic verbatim — TC price is just fed in as the base cost. This keeps agent-facing pricing
consistent across own and TCTT inventory and avoids a second markup implementation.

---

## 3. Resolver contract

```
resolveActivityPrice({
  activity,            // Hina AttractionActivity (has tcttSource)
  date, adultCount, childCount, infantCount,
  reseller,            // for markup tier
  slotId?,             // timeslot activities
}) -> {
  source: "own" | "tctt",
  adultPrice, childPrice, infantPrice,       // agent-facing unit prices
  pricing: [...],                            // mapped to the existing frontend shape (doc 07)
  // present only when source === "tctt" (slice 5 needs them to echo to TCTT booking):
  tcttQuote: {
    tcttAttractionPublicId, tcttActivityPublicId,
    tcAdultPrice, tcChildPrice,              // the EXACT TC prices to echo back (price-check)
    slotId?, startTime?, endTime?,
  }
}
```

The output `pricing[]`/unit-price fields map **onto the existing response shape** the b2b-hina-tourism
frontend already consumes (doc 07 — `pricing[]` keyed by `transferType`, `totalPrice`, etc.), so the
frontend needs **no change** (white-label). TCTT activities are `normal` / `transferType:"without"`.

---

## 4. Touchpoints (additive `if (activity.tcttSource?.isTcttSourced)` branches)

In `api-server-main` B2B attraction module — confirm exact fn/line at implementation
(per [[exact-contract-fidelity]]):
- **detail** — `b2bClientAttractionController.getSingleAttraction`: per activity, call the resolver
  instead of the own-only pricing.
- **activity price / recheck** — `getSingleActivityPrice` + `b2bAttractionHelper.activitySinglePriceDetails`.
- **timeslots** — the timeslot endpoint: for tctt-sourced timeslot activities, fetch TCTT slots +
  Hina markup (§6).
- **listing** — uses **hints**, no live calls (§5).

Existing branches (Burj/DPR/Parmar/internal) are untouched; this is a new keyed branch.

---

## 5. Listing strategy (no live fan-out)

A results page prices many activities; do **not** call TCTT per activity. Use the synced
**low-price hint** (stored as the shell's synthetic `ticketPricing`, or the staging hint) run through
the Hina markup for the "from" price. For both-source activities, listing "from" =
`min(ownFrom, hinaMarkup(tcttHint))`. The **exact** price (live compare) happens on the detail page and
again at booking — so the listing figure is an estimate, the detail figure authoritative. (Same UX as
any cache-then-confirm catalog.)

---

## 6. Timeslot activities

TCTT `/activity/timeslot` returns `[{slotId, startTime, endTime, available, adultPrice, childPrice}]`
(TC-marked-up). Apply Hina markup to each slot's prices. For a *both-source* timeslot activity, own
slots and TCTT slots are different slot sets, so per-slot cheapest doesn't align — **locked (§9):
resolve source at the activity level** (compare a representative/min price), then serve that source's
slot list; never interleave. Single-source timeslot activities are trivial.

---

## 7. Resilience & performance

- **Failure fallback**: if the live TCTT call fails, a both-source activity falls back to **own**;
  a tctt-only activity surfaces as temporarily unavailable (don't 500 the whole page).
- **Concurrency**: resolve a detail page's activities in parallel (`Promise.all`).
- **Short-TTL cache** per `(tcttActivityPublicId, date)` — **60s** (locked §9), to avoid hammering TCTT
  when a user reloads/reconfigures; always bypassed at booking (fresh).
- **Markup parity**: API-connected prices still pass through markup exactly like own inventory — never
  bypass markup (matches the existing provider rule).

---

## 8. Price drift → booking

The chosen source and price can change between detail view and checkout. Slice 5 **re-resolves** at
booking; reuse the existing price-recheck/`expiresIn` pattern — if source or price changed, re-confirm
with the agent before charging. A browse-time "own" can become "tctt" at purchase, or vice-versa.

---

## 9. Locked decisions (2026-06-21)

1. **Timeslot both-source resolution** — ✅ **resolve source at the activity level** (compare a
   representative/min price), then serve that source's slot list; never interleave own + TCTT slots.
2. **VAT on TCTT price** — ✅ **apply the Hina activity's VAT config on top of the TC price**, uniform
   with own inventory (TC price treated as the pre-Hina-VAT base cost). Revisit only if TC confirms its
   prices are already VAT-inclusive for our account.
3. **Cache TTL** — ✅ **60s** per `(tcttActivityPublicId, date)` for detail/list resolution; **always
   bypassed at booking** (fresh). Tunable via config.

---

## 9a. Implementation status

**Core — DONE** (in `api-server-main`, additive; logic runtime-verified, 7-assertion mock harness):
- Engine override: `b2bAttractionHelper.activitySinglePriceDetails` gains a `tcttCost` param + branch
  (mirrors the Dubai Parks cost override) — feeds the live TC price in as base cost so the existing
  markup/VAT pipeline yields the agent-facing price (two-layer). Undefined for all existing callers →
  no behavior change.
- Resolver: `b2b/helpers/attraction/tcttResolver.js` — `resolveActivityPrice` (own-only / tctt-only /
  both→cheapest by `lowPrice`) + `fetchTcttRate` (60s cache, **bypassed at booking** via `noCache`).
  Resilience verified: tctt-only + 409 → `unavailable` (no throw); both + TC failure → fall back to own.
  Returns `{...engineResult, source, tcttQuote?}` (tcttQuote = exact TC prices for slice-5 echo).
- Wired: `b2bClientAttractionController.getSingleActivityPrice` (price recheck) branches on
  `activity.tcttSource?.isTcttSourced`.

**Wiring — DONE** (all three pricing touchpoints branch on `activity.tcttSource?.isTcttSourced`):
- `getSingleActivityPrice` (price recheck) ✓
- `getSingleAttraction` (detail) — each activity routed through the resolver ✓
- `getTimeSlot` — TCTT slots fetched + mapped to the existing slot shape (slotId preserved) so the
  markup loop applies Hina markup; safe fallback activity lookup for shells ✓
- Listing works via the shells' synthetic `ticketPricing` hint (existing engine path).

End-to-end live test deferred: needs a tctt-sourced activity in the DB (a slice-3 mapping write →
on the test DB) + a sandbox call.

## 10. Feeds into

**Slice 5** (booking + dual-wallet): calls the resolver with the final pax/slot, takes `source` +
`tcttQuote` to route the booking (TCTT vs own) and echo the exact TC price; agent pays the agent-facing
price from the Hina wallet, TC debits Hina's TC wallet at the TC price.

Related: [[tctt-api-v1-contract]], doc 10 §3a/§4, doc 11 (markers), [[exact-contract-fidelity]],
[[no-production-writes]].

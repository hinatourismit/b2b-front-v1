# Backend Audit — Architecture & Design Issues

Structural debt on the active surface. These aren't crashes — they're things that make the system
fragile, hard to change, or inconsistent.

## A1 — Multiple parallel order/pricing engines (High)
There are **three** near-duplicate attraction order-pricing implementations:
- `b2b/helpers/attraction/b2bAttractionOrderHelper.js` → `attractionOrderCreateHelper` (~570 lines)
- `b2b/helpers/attraction/b2bAttractionOrderHelper2.js` → `attractionOrderCreateHelper2` (the one the
  controller actually calls)
- `api-out-attraction-v1-main` has its own `attractionOrderCreateHelper2` copy again.

They re-implement the same markup/VAT/transfer math. Any pricing rule change must be made in N places
or they silently diverge. **Recommend:** one shared pricing module; delete the dead engine (see
unused-code U2).

## A2 — Provider routing by scattered hardcoded ObjectId comparisons (High)
Supplier selection is done by comparing `connectedApi` to hardcoded id strings, spread across
controllers and helpers (`b2bAttractionOrderHelper.js:588/649/742/773/1545`,
`b2bClientAttractionController.js:870/880`, order controller `:848`, plus admin/api-out mirrors). No
registry/strategy map; adding or changing a provider means editing every branch (the TCTT work had to
thread through all of them). Combined with loose `==` (bug B4) this is brittle. **Recommend:** a
provider registry keyed by `connectedApi` → `{ timeslot, book, cancel, mapTickets }` handlers.

## A3 — The two-step create→complete "OTP" gate is a no-op (Med)
Order create stamps `otp: 12345` and complete requires `otp === 12345` (see security S1). The intended
OTP-email step is commented out. So the create→complete split adds round-trips and a `pending` order
state but provides **no actual authorization value**. Either implement a real OTP or collapse to a
single confirmed booking call.

## A4 — No transaction around multi-document money flows (Med)
Order completion performs, as separate awaits: order `.save()`, `deductAmountFromWallet` (+`save`),
`createB2BTransation...`, and the supplier booking. A failure between them leaves inconsistent state
(money moved but order failed, or order completed but transaction record missing). With Atlas (replica
set) available, wrap these in a mongoose **session/transaction**, or add a compensation/reconcile path.

## A4b — Payment/order/wallet flow copy-pasted across every module (High)
Each booking module (attraction, hotel, transfer, flight, visa, insurance, a2a, order, wallet-deposit)
re-implements its **own** CCAvenue capture, wallet-deduct, transaction-record, and order-complete logic
instead of sharing one payment/settlement service. Evidence it's literal copy-paste: 6 separate
`completeXWithCcAvenue` handlers, each repeating the decrypt → check `order_status` → settle sequence.
This duplication is exactly **how the attraction capture ended up insecure** (S0): the shared step
(signature decryption) was commented out in *one* copy and no one caught it because there's no single
implementation. **Recommend:** one `paymentCapture(provider, payload)` + one `settleOrder(order)`
service consumed by all modules.

## A5 — Pricing/markup logic duplicated per module (Med)
Attractions, A2A, transfers each re-implement profile/sub-agent/client markup math instead of a shared
markup service. The same class of bug (e.g. B8 divide-by-zero, flat-vs-percentage handling) recurs in
each. **Recommend:** a single `applyMarkup` pipeline consumed by all booking modules.

## A6 — "No profile markup ⇒ block + email" business rule is a landmine (Med)
`b2b/controllers/attraction/b2bAttractionOrderController.js:244-269`: any order activity with
`profileMarkup <= 0` is rejected with `E1001`, logged to `B2bNoProfileMarkupOrders`, **and emails dev
addresses** — on every attempt. This makes any newly-added/imported activity (e.g. TCTT-sourced)
**unsellable until a markup row exists**, with a confusing "not available" error. We hit it twice this
session. **Recommend:** seed a default markup on activity creation/import, and make the guard a clean
validation (no dev email).

## A7 — Inconsistent supplier-failure semantics (Med)
Within the same completion loop, providers handle failure differently: the Dubai Parks branch
**throws** and aborts the whole order (`b2bAttractionOrderHelper.js:612`), others mark the activity
`failed` and `continue`. So a multi-activity order's behavior on a supplier error is provider-dependent
and unpredictable (all-or-nothing vs partial). **Recommend:** one explicit policy.

## A8 — `console.log` as the logging strategy (Low)
92 `console.log` calls in active b2b code (and far more repo-wide), including request/response dumps in
hot booking paths (`createDubaiParkOrder`, auth). No levels, no structured logging, and some dump PII /
tokens. **Recommend:** a logger with levels; strip request/response dumps.

## A9 — Auth does a populated DB read on every request (Low)
`b2bAuth` runs `Reseller.findOne(...).populate(marketStrategy, configuration, country).lean()` per
request (cache call commented out). Fine at low volume; a hot-path N+populate. Consider short-TTL
caching of the reseller/config.

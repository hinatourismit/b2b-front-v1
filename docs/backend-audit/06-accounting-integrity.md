# Backend Audit — Accounting Integrity

> Asked specifically: *"entries passed / missing entries"*. This traces the **attraction** double-entry
> posting path end-to-end (`b2bAttractionAccountsHelper.js`), the most representative flow. The same
> patterns recur in `hotelAccountsHelper.js` and the admin accounts helpers. The cancellation-reversal
> and the period/P&L reports were sampled, not fully traced — flagged where so.

The system is a real double-entry ledger: journal → sub-sales/purchase/VAT books → ledger, with
return books for cancellations, GL codes per product, and a chart of accounts. The defects below cause
**missing entries**, **unbalanced journals**, and **wrong-period** postings — silently.

## AC1 — Accounting is posted fire-and-forget (High → "missing entries")
`b2b/controllers/attraction/b2bAttractionOrderController.js:361` (and `:647`):
```js
attractionOrderAccountsHelper({ orderId, date, activities, totalAmount, agentId, description });
// ↑ no await, no try/catch
```
The order completes and responds **before** accounting runs. If the helper rejects (see AC2/AC3), the
promise is dropped, the response is already sent, and the **sales/ledger/VAT entries for that order are
never written** — with no error to anyone. This is the primary "order exists, entry missing" mechanism.
**Fix:** `await` it inside the order transaction (or a reliable outbox/queue with retries), and surface
failures.

## AC2 — Pervasive null-dereference of COA / GL / chart-account lookups (High)
The helper looks up chart accounts and immediately dereferences `._id` with no null guard:
- `chartAccountVatPayable._id` — `b2bAttractionAccountsHelper.js:417` (null if `ChartAccountSetting`
  config #1002 or its COA is missing)
- `agentChartAccount._id` — `:430` (null if the **agent has no chart account** yet)
- in `processActivityEntries`: `creditTransferChartAccount._id` (~`:98`), `creditChartAccount` /
  `debitChartAccount` from `activityGlCodes.creditCodeId/debitCodeId` (~`:197-261`) — **null if the
  activity has no GL-code mapping**.

Any missing config → `TypeError: cannot read _id of null` → the whole posting throws → (because of AC1)
**the order's entire accounting is silently dropped**. So: a new agent before their COA is created, or
any activity without GL codes (e.g. freshly imported/TCTT activities), books **zero** accounting. **Fix:**
validate each lookup; if a required account is missing, fail loudly / queue for repair — don't post a
partial set and don't swallow.

## AC3 — No transaction around the multi-entry journal (High → "unbalanced books")
`grep startSession|withTransaction` across the accounting helpers → **0**. A single posting writes a
journal, `processActivityEntries` (multiple sales debit+credit ledgers + sub-sales book), a VAT book
entry, a VAT ledger, and transfer entries — as **separate `await`s**. A failure **midway** (e.g. after
the VAT credit but before the sales ledger) leaves a **partial, unbalanced journal** persisted forever.
There's also **no balance assertion** (no check that Σdebit == Σcredit for the journal before
"commit"). **Fix:** wrap the whole posting in a mongoose session/transaction (Atlas supports it); assert
balance before commit.

## AC4 — Entries stamped with posting-time, not the transaction date (Med → wrong period)
The helper receives `date` (the order's `createdAt`) but passes `date: new Date()` to every sub-entry
(`:405,:412,:425`, and throughout `processActivityEntries`). So entries are dated when the *posting*
runs, not when the *order* happened. If posting is delayed, retried, or back-filled, revenue/VAT lands
in the **wrong accounting period**. **Fix:** use the passed `date` consistently.

## AC5 — Purchase (COGS) entry posted for only one supplier path (Med → understated COGS)
`apiPurchaseEntry(...)` has a **single** call site — `b2b/helpers/attraction/b2bAttractionOrderHelper.js:732`
— inside one supplier branch. The **Dubai Parks** branch (`:588`) and others don't post a supplier
purchase entry at booking. For API-sourced bookings the cost is incurred *at booking time*, so a missing
purchase entry means **COGS is understated and profit overstated** in the books for those suppliers.
(Internal-inventory bookings are fine — their purchase posts at inventory-buy time.) **Verify** each
branch posts its cost; standardize.

## AC6 — Cancellation reversal is request→approve, not guaranteed (Med → overstated revenue)
Cancelling posts a `SalesCancellationRequest` + `AttractionSalesCancellationSupport`
(`admin/controllers/attraction/admAttractionSalesController.js:244,303,435`) — a **request** that needs
separate approval to post the return-book reversal (`SubSalesReturnBook`/return ledgers). Risks:
(a) if approval is never done, the original sales entry **stands** while the order is cancelled/refunded
→ revenue overstated; (b) the reversal isn't transactional with the refund. **Verify** the approval path
posts balanced return entries and that no cancel/refund can complete without it.

## AC7 — Balance depends entirely on complete GL config; no guardrail (Med)
Double-entry only balances if every activity has correct `creditCodeId`/`debitCodeId` GL mappings and
VAT inclusive/exclusive is handled consistently. There's no validation that an activity is
"accounting-ready" before it can be sold, and no per-journal balance check. A single GL misconfig
silently unbalances the ledger (and, via AC1/AC2, may post nothing at all).

## AC13 — Agent cancellation refunds money but posts NO accounting reversal (CRITICAL)
`b2b/controllers/attraction/b2bAttractionOrderController.js:718` `cancelAttractionOrder` does, on a
normal agent cancel: restore tickets, refund the wallet (`B2BTransaction` credit + `wallet.balance +=`,
`:865-881`), and set the item `status:"cancelled"` (`:894`). It posts **zero** accounting reversal —
no `SubSalesReturnBook`, no return ledger, no `attractionOrderAccountsHelper` reversal. The sales-return
posting exists **only** in a separate **manual admin** flow (`admAccountSalesCancellationController` +
an approval step), which this path never triggers. **Result:** the customer is refunded while the
**original sales entry stands** → revenue permanently overstated and the **ledger diverges from
wallet/cash** for every agent cancellation. This is AC6, confirmed and worse (fully decoupled). **Fix:**
post a balanced sales-return atomically inside the cancel/refund (or auto-create + auto-approve the
cancellation request).

## AC14 — Retained cancellation fee is never recognized as income (High)
Same function: the refund is `orderAmount - cancellationFee` (`:872`), so the fee is *kept* simply by
not refunding it — but **no income/fee entry is posted** for it. The retained fee is invisible to the
books (and, with AC13, the whole original sale is never reversed either). **Fix:** post the retained fee
as fee income on cancellation.

## AC15 — Refund transaction records the wrong closing balance (Med)
`:874` stores `closingBalance: wallet.balance` **before** `:880` applies `wallet.balance += credit`. So
every refund transaction's `closingBalance` is the **pre-refund** balance — wrong, and it desyncs the
running-balance audit trail. (The wallet update is also the non-atomic B2 pattern.)

## AC16 — Supplier booking cancelled only for Burj Khalifa on refund (High → real loss)
`:846-851` calls `cancelBooking(...)` **only** when `connectedApi == Burj Khalifa`. For Dubai
Parks / Parmar (and any other supplier), the agent is refunded but the **supplier booking is never
cancelled** → the supplier cost stands, the seat/ticket is wasted, and the platform eats the loss. Mirror
of A7's inconsistent supplier handling, here on the refund side.

> Bonus (non-accounting, logged in report 02): `:767` the cancellation cutoff check uses
> `new Date().setDate(0, 0, 0, 0)` — `setDate` takes one arg and `0` rolls to the **last day of the
> previous month**; the intent was `setHours(0,0,0,0)`. The "can't cancel after activity date" guard
> compares against a garbage date → broken.

## AC8 — Fire-and-forget posting is systemic, and one path is commented out (High)
AC1 isn't attraction-only. The same un-`await`ed call pattern appears for:
- quotations — `b2b/controllers/quotation/b2bQuotationController.js:6319`,
  `admin/controllers/quotation/admQuotationController.js:8728`,
  `admin/helpers/quotation/quotationCostingAccountsHelper.js:21,38`
- external attraction orders — `admin/controllers/attraction/admAttractionsOrdersController.js:3214`
- purchase — `b2b/helpers/attraction/b2bAttractionOrderHelper.js:732`

Worse, `admin/controllers/quotation/admQuotationController.js:9162` has the posting **commented out**
(`// quotationSalesAccountsHelper({...}`) → that quotation flow books **no sales entry at all**. So
"missing entries" is a whole-platform sales-posting property, not a one-off.

## AC9 — A balance validator exists but the auto-posting paths don't use it (High)
`admin/helpers/accounts/validation.js:38` does check `if (debitTotal !== creditTotal) return "…must
equal…"`. But it's used for **manual** journal entry; the **automated** sales/purchase posting helpers
(`b2bAttractionAccountsHelper`, quotation/hotel accounts helpers) **never call it**. So machine-posted
journals — the vast majority — are written with **no balance check**. **Fix:** route every posting
(manual and automated) through the same validate-then-commit gate.

## AC10 — Empty catches inside accounting helpers (Med → silently lost entries)
`catch {}` in accounting code means a failed ledger/wallet posting vanishes:
`admin/helpers/accounts/accountsWalletHelper.js`, `admin/helpers/accounts/accountNatureHelper.js`,
`admin/helpers/accounts/accountsLegerComment.js`, `admin/controllers/accounts/admAccountPayableController.js`,
`admin/controllers/accounts/admInventoryPurchaseController.js`. A swallowed error in
`accountsWalletHelper` = a wallet movement with no matching ledger entry → silent imbalance.

## AC11 — Reports read the (possibly incomplete) ledger + rounding drift (Med)
`admin/helpers/accounts/PLAndBalanceSheetHelper.js` aggregates the ledger and computes
`balance = Number(totalDebit.toFixed(2)) - Number(totalCredit.toFixed(2))` (`:50`). It inherits every
upstream gap (AC1/AC2/AC8 missing entries, AC3 partial journals) — so the P&L / balance sheet **won't
reconcile** and there's no anomaly flag. `toFixed(2)` per-bucket rounding can also accumulate cents.

## AC12 — Manual posting surfaces need authz + audit review (Med, governance)
Manual/override entry points exist: `admAccountExpenseEntryController`, `admAccountManualPurchaseController`,
`admAccountSalesPaymentController`, `admAccountPurchasePaymentController`, `admChartAccountController`.
These let staff post/adjust entries directly. **Verify**: role-gating, an immutable audit trail, and
that they pass through the AC9 balance gate (not yet traced).

## AC17 — Wallet deposit/withdraw → ledger posting is fire-and-forget (High → cash off the books)
The wallet→ledger poster `accountsWalletDeposit(...)` (`admin/helpers/accounts/accountsWalletHelper.js:10`)
and its mirror `accountsRemoveMoneyDeposit(...)` (`:98`) are invoked **without `await` and without
try/catch** at every call site:
- `admin/controllers/global/admB2bWalletsController.js:782` (deposit), `:206`, `:432`, `:885` (remove),
- `admin/controllers/global/admB2bWalletDepositRequestsController.js:141` (deposit).

The wallet **balance** is mutated by a *separate* call (`addMoneyToB2bWallet` / direct `wallet.save()`),
which does complete. So if the ledger poster throws — and it dereferences `productGlCode.creditCodeId`
(`:17`), `selectCashCoa.chartAccountId` (`:29`), `chartDebitAccount._id`, `chartCreditAccount._id/.name`
with **no null guards** (AC2 class) — the agent's cash is credited/debited on the wallet while **no
cash-receipt / cash-payment entry hits the ledger**. Result: wallet balance and the cash + agent-wallet
GL accounts **drift permanently**, and the drift is silent (fire-and-forget). This is the direct
accounting consequence of the wallet bugs B1/B2/B2b: the money side and the books side are two
independent, un-transacted writes.

## AC18 — `addSubCashBook` fire-and-forget inside the wallet posters → cash-book ≠ ledger (Med)
Within both `accountsWalletDeposit` and `accountsRemoveMoneyDeposit`, the **ledger** legs are `await`ed
(`addNewLedger`) but the **cash-book** legs are not — `addSubCashBook({...})` is called bare **4×** in the
helper (`accountsWalletHelper.js`, e.g. `:42`, `:65` and the mirror). So even when the poster runs to
completion, a failed `addSubCashBook` leaves the **ledger updated but the cash book missing that entry**
→ the two sub-books no longer agree, breaking any cash-book vs ledger reconciliation.

## AC19 — No independent "wallet spent → ledger" guarantee on bookings (High)
There is **no wallet-side ledger posting when a booking deducts the wallet.** The only thing that posts
the agent-wallet COA on a sale is the per-module **sales** helper (`b2bAttractionAccountsHelper.js:375-390`
picks the `agent-wallet` COA when `paymentMethod==="wallet"`), and that helper is itself fire-and-forget
(AC1) and un-transacted (AC3). So the booking flow does: (1) `deductAmountFromWallet` — real balance drop,
always happens; (2) sales accounting — may silently no-op/partial. When (2) fails, the wallet balance
falls but **nothing records the wallet being spent in the ledger** → the agent-wallet liability account and
the actual wallet balance diverge with no self-healing. Unlike a proper design where every wallet movement
emits its own balanced ledger pair, here the books depend entirely on a separate, unreliable helper.

## AC20 — Running balance is computed read-latest-then-write, non-atomically (High → corrupted balances)
`addNewLedger` (`accountSubBookHelper.js:243`) calls `getRunningBalance(ledgerChartOfAccount, drCr, amount)`
which **reads the latest prior ledger row** for that account (`:275` `Ledger.findOne(...).sort(latest)`),
adds/subtracts, then saves the new row with that `runningBalance` (`:245-263`) — all **without a
transaction or any lock** (AC3). Two concurrent postings to the same agent/cash account both read the
*same* latest balance and both compute the *same* running balance → the stored `runningBalance` column is
**corrupted** under any concurrency (and the same class of bug as AC15's manual case, but here it is the
generic posting primitive used by *every* ledger entry in the system). Statements of account / trial
balance that trust `runningBalance` will be wrong. **Fix:** derive running balance in the read/report
layer (or compute under the same DB transaction with a per-account lock), never as a non-atomic
read-modify-write at write time.

## AC21 — Hotel purchase/COGS posting is double fire-and-forget → understated COGS + missing vendor payable (High)
The attraction COGS gap (AC5) is **not attraction-specific — hotel has it worse**, on two layers:
1. **Controller layer:** `b2b/controllers/hotel/b2bHotelOrdersController.js:1480` (`hotelAccountPurchaseHelper`),
   `:1492` (`hotelAccountsSalesHelper`), `:2455` (`hotelAccountPurchaseHelper`) are all called **without
   `await`/try** (AC1 class) — a hotel booking commits and takes payment while its accounting may
   silently no-op.
2. **Helper layer:** inside `b2b/helpers/hotel/hotelAccountsHelper.js`, the purchase sub-book
   `addSubPurchaseBook({...})` is called **4× and `await`ed 0×** (`:314,:347,:484,:517`). So even when the
   helper runs, the **purchase/COGS + vendor-payable** legs are fire-and-forget while the sale-book legs
   are awaited → the sale can post while the matching purchase doesn't.

Net: hotel bookings can record **revenue without COGS** and **without the supplier/vendor payable** →
gross profit and liabilities both overstated, on every hotel order, silently. Same fix as AC1/AC5:
`await` + transaction-wrap and assert Σdr==Σcr across *both* the sale and purchase legs.

## AC22 — Bulk inventory/account-nature import swallows per-row failures (Med → silent import loss)
`admin/controllers/accounts/admInventoryPurchaseController.js:255` — the per-ticket upload runs
`try { new AccountNature(...).save() } catch (err) {}` inside a `Promise.all` over CSV rows. A row that
fails validation/save is **silently dropped**: no error log, no failure count, no surfacing to the user
(the request still 200s). Combined with the streaming CSV parse (`createReadStream(...).pipe(parse)`),
import completeness is unverifiable. **Fix:** collect failures, return a per-row result summary, and write
to `accountsUploadErrorLogs` (which exists for exactly this) instead of an empty catch.

## AC23 — Payment allocation: commented-out ledger save + swallowed errors → paid invoices stay "outstanding" (High)
`admin/helpers/accounts/admAccountSalesPaymentHelper.js` (`markPurchasePayement` → `processLedgerPayment`):
- The function sets `ledger.clearanceStatus = ...` on the invoice ledger, then its own
  **`// await ledger.save()` is commented out** (`:160`). The status change only persists if the *same*
  object is later re-saved via `ledgerPaymentInfo.ledger.save()` (`:198/:251`) — and only for ledgers
  pushed into `ledgerPaymentInfosToSave`. Any ledger whose `LedgerPaymentInfo` is recorded but whose row
  isn't re-saved keeps its old status → an invoice is **marked paid in `LedgerPaymentInfo` but still shows
  outstanding on the ledger** (or vice-versa). SOA/aging then misreport, risking double-collection.
- `processLedgerPayment`'s `catch (err) { console.log(err) }` (`:162`) returns **`undefined`** on failure.
  The caller does `totalLedgerAmount = await processLedgerPayment(...)`, so the running accumulator
  becomes `undefined` → next iteration `Number(undefined)` = **`NaN`**, `NaN < totalAmount` is `false` →
  the allocation loop **silently stops**, leaving the payment partially allocated while earlier
  `LedgerPaymentInfo` writes already landed. Money recorded as received, invoices not fully cleared.
- Balance is computed as `Number(totalAmount).toFixed(2) - Number(totalLedgerAmount).toFixed(2)` (`:63`) —
  string-coerced subtraction (AC11 rounding class), and the whole multi-ledger allocation runs with **no
  transaction** (AC3), so a mid-loop throw leaves a subset of `LedgerPaymentInfo`/ledger rows saved.
- The guard `if (totalLedgerAmount <= totalAmount) { save } else throw "…should be greater than…"`
  (`:195/:247`) has a **misleading message** (it throws when the selected ledgers *exceed* the payment),
  so legitimately over-selected partial payments fail with a confusing error.

## AC24 — Two divergent cancellation implementations; only the admin one is correct (High)
There are **two** code paths that cancel an order, and they don't agree:
- **Admin path** (`admin/controllers/accounts/admAccountSalesCancellationController.js`) is the *correct*
  one: it computes `salesReturnAmount = totalAmount − cancellationChargeAmount` (`:411-416`), **recognizes
  the retained fee** via a cancellation-charges COA, refunds the **net** to the wallet (`:420-434`), and
  posts an **awaited, balanced** sales-return reversal (`addSubSaleReturnBook` + `addNewInventoryReturnBook`
  + `addNewLedger` debit legs). The purchase-side mirror
  (`admAccountPurchaseCancellationController.js:203-343`) likewise recognizes cancellation charges and
  posts purchase-return + VAT-return reversals.
- **Agent self-service path** (`b2b/controllers/attraction/b2bAttractionOrderController.js:718`,
  `cancelAttractionOrder`) is a **broken duplicate**: it refunds the **full** amount (no fee), posts **no
  reversal**, and **recognizes no fee** (this is AC13/AC14 — now explained: it's not that reversal is
  missing from the system, it's that the agent path reimplements cancellation and omits the accounting the
  admin path does).

So the same business event produces correct books if an admin does it and **corrupt books if the agent
does it**. Even the admin path is **not transactional** (AC3) and refunds the wallet **non-atomically**
(B2 class: `B2BWallet.findOne` → mutate → `save`) and runs **no balance gate** (AC9) — a crash between
"refund wallet" and "post reversal" leaves money moved but books un-reversed (or vice-versa). **Fix:** one
shared cancellation service used by both entry points, transaction-wrapped, fee-aware, balance-checked.

## AC25 — Reports compute balances two inconsistent ways; no trial balance exists at all (High)
- **P&L / Balance Sheet** (`PLAndBalanceSheetHelper.js`) **recompute** from the raw ledger — `Ledger.find`
  then sum `drCr × totalAmount` (`:17-36`, `:90-103`, net at `:50/:123`). Good that it doesn't trust
  `runningBalance` — **but** it sums only the entries that *exist*, so every fire-and-forget gap (AC1, AC5,
  AC17, AC19, AC21) **silently understates** the statement, and there is **no Σdebit==Σcredit assertion**
  anywhere in the pipeline.
- **Statement of Account** (`admAccountSoaHelper.js`) takes the opposite approach — it **trusts the stored
  `runningBalance`** (`:43`, `:51-52`, `:91`, `:198`), so it inherits the **AC20 corruption** directly into
  customer-facing statements.
- Because the two reports derive balances differently, **they can disagree** for the same account/period,
  and there's no third source of truth to arbitrate — because **there is no trial balance report anywhere
  in the codebase** (`grep -i "trial.?balance"` → **0** hits). A double-entry system with no trial balance
  has **no built-in way to detect that its books are unbalanced** — the AC1/AC3/AC17 drift is invisible by
  design. `.toFixed(2)` per-row rounding (AC11) compounds in both reports.

## AC26 — Expense entries never reach the general ledger → P&L omits all OPEX (High → overstated profit)
`admin/controllers/accounts/admAccountExpenseEntryController.js` saves an `ExpenseEntry` document and
returns it (`:170,:313,:333,:461`), but **every ledger/journal posting call in it is commented out** —
stripping comment lines leaves **zero** `addNewLedger`/`addLedger`/`addJournal`/`new Ledger` calls. Since
`PLAndBalanceSheetHelper` reads **only** `Ledger` (`:17,:90`), recorded expenses are **invisible to the
P&L** → operating profit is **overstated by the entire expense base**. `admAccountManualPurchaseController`
similarly posts no balanced GL journal in its live path (only an `addSubCashBook` import + a
`LedgerPaymentInfo` write at `:199`) — manual purchases don't produce a balanced double-entry either.
Combined with AC9 being **confirmed dead** (the `debitTotal !== creditTotal` validator is called from
**nowhere** in `admin`/`b2b`), nothing in the system enforces that any posting balances. (Also:
`admAccountPurchasePaymentHelper.js` is a line-for-line twin of AC23 — same commented `ledger.save()` at
`:160`, same swallowed catch, same `.toFixed(2)` math — so the vendor-payment side has the identical
allocation defects.)

## Confirmed system-wide
- **Transactions across the ENTIRE accounts surface (controllers + helpers) = 0.** No accounting
  operation anywhere is atomic.
- **Every wallet money-movement and its ledger entry are two separate, un-awaited, un-transacted writes**
  (AC17/AC19) — the structural root of wallet-vs-books drift.
- **The fire-and-forget posting pattern spans attraction *and* hotel** (AC1, AC21) — it is the house
  style of this codebase, not a one-off, so assume every order module that posts accounting shares it
  until proven otherwise.
- **Nothing enforces balance and nothing detects imbalance.** The `debitTotal !== creditTotal` validator
  is dead (AC9), no posting path asserts Σdr==Σcr, expenses bypass the GL entirely (AC26), and there is
  **no trial balance** (AC25). The system can be silently unbalanced with no surface that would reveal it.
- **There are two of everything, and the duplicates drift.** Two cancellation paths (AC24), two
  payment-allocation twins (AC23/AC26), two balance-derivation methods in reporting (AC25). Each pair
  disagrees — the copy-paste duplication (design issue A4b) is the structural root.

## Net effect
A booking can **succeed and take the customer's money** while posting **no accounting entry** (AC1+AC2),
a **partial unbalanced** one (AC3), in the **wrong period** (AC4), **without its COGS** (AC5/AC21), and a
later cancellation may **not reverse** it (AC6/AC24). Wallet top-ups can credit cash that **never reaches
the books** (AC17); bookings can spend the wallet with **no ledger record** (AC19); running balances
**corrupt under concurrency** (AC20); payments mark invoices paid while they still read **outstanding**
(AC23); **all OPEX is invisible to the P&L** (AC26); and **no trial balance** exists to catch any of it
(AC25). Reconciliation will drift and won't self-heal — and won't even be *detectable*.

## Recommended order of fixing
1. `await` + transaction-wrap **every** posting (AC1, AC3, AC17, AC21, AC24) and assert Σdr==Σcr by
   wiring the existing-but-dead validator (AC9) into a single `postJournal()` primitive.
2. Guard every COA/GL lookup; block sale/booking when accounting isn't ready (AC2, AC7).
3. Make wallet movement and its ledger entry **one atomic unit** (AC17/AC18/AC19); derive running balance
   in the read layer, not at write time (AC20).
4. Collapse the duplicated paths into shared services — one cancellation (AC24), one allocation (AC23),
   one balance-derivation for reports (AC25) — and **add a trial balance** report (AC25).
5. Route expenses + manual entries through the GL (AC26); standardize purchase/COGS posting (AC5/AC21).
6. Use the transaction date, not posting time (AC4).

## Coverage — the exhaustive pass is now complete (AC1–AC26)
The module is large (≈38 account models, ≈15 helpers, ≈20 admin accounts controllers). All the major
flows have now been traced end-to-end:

**Traced / confirmed (AC1–AC26):**
- **Sales posting** (attraction) end-to-end — the systemic fire-and-forget + no-transaction +
  no-balance-check + null-deref pattern (AC1–AC4), single-supplier COGS (AC5), GL-config dependence (AC7).
- **Systemic posting integrity** — fire-and-forget is systemic with one commented-out path (AC8), the
  dead balance validator (AC9), empty catches in accounting helpers (AC10), report rounding (AC11),
  manual-posting governance (AC12).
- **Cancellation / refund** — agent self-service refund without reversal/fee (AC13–AC16) and the
  divergence from the correct admin reversal path (AC24).
- **Wallet ↔ ledger** — deposit/withdraw posting fire-and-forget (AC17), cash-book≠ledger within the
  poster (AC18), no wallet-spent→ledger guarantee on bookings (AC19), non-atomic running balance (AC20).
- **Purchase / inventory** — hotel COGS double fire-and-forget (AC21), bulk inventory import swallows
  rows (AC22).
- **Payments / allocation** — sales-payment commented-save + swallowed-error + NaN-accumulator (AC23),
  and its line-for-line purchase-payment twin (AC26).
- **Reports / reconciliation** — P&L recompute-from-ledger vs SOA trust-runningBalance divergence, and
  the total absence of a trial balance (AC25).
- **Journal / expense / manual** — expenses never reach the GL, manual purchase posts no balanced
  journal, validator dead (AC26).

**Residual (low-value, not separately written up):** the precise dr/cr *sign* convention per COA type
across every helper (the model's `getRunningBalance(ledgerChartOfAccount, drCr, amount)` convention is
confirmed, but verifying each posting's sign against intended accounting treatment is a line-by-line
reconciliation best done with the finance owner); and the `accountsUploadLogs`/`accountsUploadErrorLogs`
schema-level dedupe rules. Neither is expected to surface a new *class* of defect beyond AC1–AC26.

**Bottom line:** the double-entry engine is not safe to trust as a source of financial truth in its
current state. The defects are not isolated bugs but a consistent set of structural patterns
(fire-and-forget, no transactions, no balance enforcement, duplicated-and-drifted paths, GL bypasses).
See **Recommended order of fixing** above.

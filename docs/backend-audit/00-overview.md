# api-server-main — Backend Audit

> Date: 2026-06-24. Target: `api-server-main` (mounted at `/api/v1/**`). The codebase is large
> (~1,441 JS files, ~274k LOC; **202** admin controllers, **52** b2b controllers, plus b2c). An
> exhaustive line-by-line audit of all of it is out of scope for a single pass, so coverage is:

## Coverage & method
- **Full-surface scan**: pattern scans were run across the **entire repo** (b2b + admin + admin-b2b +
  b2c) for high-confidence bug classes — payment-capture verification, wallet atomicity, hardcoded
  secrets/OTP, loose equality on ObjectIds, empty/swallowed catches, unguarded `JSON.parse`, NaN/null
  arithmetic, injection (`$where`/`eval`), dead/`copy` files. This is why findings now cite hotel,
  transfer, a2a, visa, flight, accounts, and global controllers — not just attractions.
- **Deep read**: the active **B2B surface** (orders, booking, wallet, pricing, auth, all six CCAvenue
  capture handlers) and the wallet utility were read line-by-line.
- **Representative, not exhaustive**: the 202 admin controllers (accounts/quotation/reporting are the
  densest) and the b2c public site were scanned + spot-read, not fully line-read. Module-level deep
  passes available on request.

Every finding cites `file:line`. Severities: **High** (correctness/security/money), **Med** (likely
bug or real design debt), **Low** (hygiene). Where a finding was already fixed during this session,
it's marked ✅ and cross-referenced.

## Reports
1. **01-architecture-design-issues.md** — structural/design debt.
2. **02-bug-risks.md** — null/undefined, type coercion, concurrency, error-handling defects.
3. **03-unused-dead-code.md** — duplicate/`copy` files, commented mounts, unused surfaces, debug noise.
4. **04-security.md** — payment-capture bypass, auth, OTP, secrets, input handling.
5. **05-module-findings.md** — per-module breakdown (every active section, with depth + findings).
6. **06-accounting-integrity.md** — double-entry posting: missing/partial/unbalanced/wrong-period entries.

## Top findings (start here)
| # | Sev | What | Where |
|---|-----|------|-------|
| **S0** | **CRITICAL** | **CCAvenue payment bypass**: attraction capture skips signature decryption (commented out), trusts `order_status` from the request body → forge `Success` to complete an order without paying. Every other module verifies — attraction was left in a debug state | `b2b/controllers/attraction/b2bAttractionOrderController.js:532-538` |
| B1 | **High** | `checkWalletBalance` returns `true` (sufficient) when credit fields are `undefined` → `NaN` compare | `b2b/utils/wallet/checkWalletBalance.js:5` |
| B2 | **High** | Wallet deduction is read-modify-write (not atomic) → concurrent bookings double-spend | `b2b/utils/wallet/deductAmountFromWallet.js` |
| S1 | **High** | Wallet-completion **OTP is hardcoded `12345`** in every order flow; real OTP commented out → the 2-step gate is theater | `b2b/controllers/attraction/b2bAttractionOrderController.js:160,162` (+ transfer/flight/visa/insurance) |
| **AC1** | **High** | Accounting posted **fire-and-forget** (no `await`/try) + null-deref'd COA/GL lookups + **no transaction** → orders that succeed but post **no / partial / unbalanced** ledger entries, silently | `b2bAttractionOrderController.js:361,647` + `b2bAttractionAccountsHelper.js` (see **06**) |
| **AC26** | **High** | **Expenses never reach the general ledger** (posting commented out) and P&L reads only the ledger → operating profit **overstated by the entire expense base**; the `dr==cr` balance validator is **dead** (called nowhere) | `admAccountExpenseEntryController.js` + `PLAndBalanceSheetHelper.js` (see **06**) |
| **AC25** | **High** | **No trial balance exists anywhere** + P&L (recompute) and SOA (trusts stored `runningBalance`) derive balances two different ways → books can be unbalanced with **no surface that reveals it** | `admAccountSoaHelper.js` / `PLAndBalanceSheetHelper.js` (see **06**) |
| **AC17/20** | **High** | Wallet top-ups post to the ledger **fire-and-forget** (cash can miss the books); `runningBalance` is a non-atomic read-then-write → **corrupts under concurrency** | `accountsWalletHelper.js` + `accountSubBookHelper.js:243` (see **06**) |
| A1 | **High** | Three parallel attraction order-pricing engines (`...OrderHelper`, `...OrderHelper2`, api-out) — divergence risk | `b2b/helpers/attraction/b2bAttractionOrderHelper.js` / `...Helper2.js` |
| A4 | Med | No DB transaction around order-save + wallet-deduct + supplier-book → partial-failure inconsistency | `b2b/controllers/attraction/b2bAttractionOrderController.js` |
| S3 | Med | Hardcoded dev email recipients in a production order path | `b2bAttractionOrderController.js:255-256` |

## Caveat
Findings reflect the code as read on 2026-06-24/25. The **accounting module is now fully traced**
(report 06, AC1–AC26 — sales/purchase posting, cancellation/refund, wallet↔ledger, payments/allocation,
reports, and expense/manual entries). The **definitive unused-endpoint diff is done** (report 03 §U6 —
b2b 91/236 and admin 168/1274 uncalled, with re-runnable tooling under `tools/`). Remaining
pattern-sampled area: the **b2c public site** — say the word for a deep pass on it.

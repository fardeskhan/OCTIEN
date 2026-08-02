# Sales Architecture Review — CAP-SALES V1.0 freeze gate

**Date:** 2026-07-24 · **Scope:** the Sales capability (quotation → order → reservation → delivery →
invoice → payment → accounting → ledger → statement → aging → dashboard → reports → Customer 360).
This is a documented release gate, not a casual check. Every ✅ is backed by something that was
actually run against the **live Neon database**.

## Architecture
| Check | Result | Notes |
|---|---|---|
| Domain boundaries respected | ✅ | Receivables logic lives in `customer-ledger` / `receivables-aging`; accounting in `posting-engine` / `sales-posting`; UI never recomputes it |
| No duplicated business logic | ✅ | Dashboard, Aging, Statements, Reports and Customer 360 all **consume** the ledger/aging services; Customer 360 reuses `getCustomerLedger` + `getReceivablesAging` |
| Services reused, not re-queried | ✅ | Statement→ledger; Aging→ReceivableEntry; Dashboard→aging; 360→ledger+aging+registers |
| Shared UI reused | ✅ | One design system (`components/enterprise/*`): DataTable, StatusBadge, ConfirmDialog, ReportLayout/ReportTable, PrintButton, StatCard — used across every Sales screen |

## Code
| Check | Result | Notes |
|---|---|---|
| No mock data in Sales | ✅ | All Sales pages read live services; none import `_data/*` (mock data remains only in other, not-yet-completed modules) |
| No dead Sales routes | ✅ | Every `/sales/*` route resolves and renders |
| No duplicate components | ✅ | Report tables are one config-driven component; status colours one registry |
| Lint (Sales files) | ✅ | 0 errors in the Sales code written for this capability |
| Lint (repo-wide) | ⚠️ | ~167 pre-existing `no-explicit-any` errors remain in **other** modules/event-handlers (documented tech debt; none introduced by Sales) |

## Security
| Check | Result | Evidence |
|---|---|---|
| RBAC enforced | ✅ | Every Sales mutation calls `requirePermission("sales.write")` / `fulfillment.*`; reads gate on `sales.read`; proven denials in prior certification |
| Audit on every mutation | ✅ | `logAudit` on quotation, SO, invoice, payment, shipment; verified live (`create/quotation` audit row with actorId; Customer 360 timeline shows audit events) |
| Multi-tenant isolation | ✅ | All queries scoped by `businessId`; integrity verified clean in prior certification (0 tenant-crossing) |

## Accounting
| Check | Result | Evidence |
|---|---|---|
| Journals balance | ✅ | Every posting via `FinancialPostingService.postEntry` rejects unbalanced entries; invoice DR AR = CR Revenue + CR GST verified |
| GL reconciles | ✅ | Runtime check: Σdebits = Σcredits across the whole ledger after postings |
| AR reconciles | ✅ | Ledger outstanding = Statement = Aging total = Dashboard AR (all ₹12,00,062 business-wide; per-customer figures tie across pages) |
| COGS on dispatch | ✅ | Shipment dispatch posts DR COGS / CR Inventory (when average cost known) |

## Runtime
| Gate | Result |
|---|---|
| End-to-end runtime verification (`/api/dev/verify-sales`) | ✅ **25/25 PASS** on live Neon |
| `tsc --noEmit` | ✅ EXIT 0 |
| `npm run build` | ✅ EXIT 0 (all Sales routes emit) |
| ESLint (Sales) | ✅ 0 errors |

## Final end-to-end scenario (verified this gate)
Quotation → Sales Order → Reservation → Shipment → **Dispatch (stock-out + reservation released +
COGS)** → Invoice → Payment → **Journal → General Ledger (balanced)** → Customer Ledger → Statement
→ Aging → Dashboard → Reports → Customer 360 → Audit. **Every step succeeds.**

## Verdict
**Sales architecture is sound and internally consistent.** Cleared to freeze as **CAP-SALES V1.0**,
subject to the known limitations recorded in `CAP_SALES_V1_RELEASE.md`.

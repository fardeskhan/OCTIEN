# BACKEND_CONNECTION_REPORT.md

**Date:** 2026-07-11 · **Rule audited:** backend exists → frontend must use it; frontend exists → must read real data.

## Connected (frontend reads/writes the real backend)
| Domain | Backend | Frontend | Status |
|---|---|---|---|
| Auth/RBAC | better-auth + Permission/Role/Membership | all pages + governance security pages | ✅ |
| Finance GL | JournalEntry/Line + FinancialReportingService | TB, P&L, BS, CF, journals, ledger, close checklist | ✅ reconciling |
| AR/AP | ReceivableEntry/PayableEntry + invoices/bills | receivables, payables, landing, aging | ✅ |
| Treasury | BankAccount + CashTransaction | accounts, cash, ledger, forecast | ✅ |
| Inventory | InventoryRecord + StockMovementRecord + projections + `adjustInventory`/`transferInventory` | products, valuation, **movements, adjustments, transfers**, low-stock | ✅ **connected this phase** |
| Procurement | Supplier/PO/GRN + create/approve/receive actions | lists, dashboard, create forms | ✅ (approve UI pending) |
| Sales | Customer/SO/Invoice + actions | lists, create flows, invoice lifecycle | ✅ |
| Invoicing | template engine + branding from Business row | preview/print/PDF/pay/void/delete | ✅ |
| Logistics | Transporter/Vehicle/Driver/Run/Stop | control tower + Leaflet map, fleet, stops, runs | ✅ |
| E-Way | EWayBill + provider abstraction | manage + compliance pages | ✅ |
| Governance | User/Role/Permission/AuditLog/ApprovalRequest | **users, roles, permissions, audit trail, approvals, ewb compliance** | ✅ **connected this phase** |
| Audit emission | AuditLog | `logAudit()` from invoice/business/eway actions + dashboard activity feed | ✅ **new** |

## Still disconnected (frontend mock or backend idle) — 41 pages
| Area | Pages | Direction of gap |
|---|---|---|
| Governance (approvals inbox/history/delegated, audit documents/sensitive/close-events, compliance gst/exceptions/jobs/tasks, security events/reviews) | 12 | backends exist → UI mock |
| Salam-Cola vertical | 16 | no domain models (product decision needed) |
| UCO vertical | 11 | no domain models |
| Finance close-history, bank reconciliation | 2 | backends exist, no data/import flow |
| Backend idle: ApprovalRequest engine, AuditEvent (domain events), FinancialReportingEngine (packages/application) | — | services never invoked by UI flows |

**Fake counters/charts remaining on real pages: 0** (all KPIs/charts on connected pages compute from the DB).

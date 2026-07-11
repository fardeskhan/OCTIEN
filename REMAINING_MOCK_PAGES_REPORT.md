# REMAINING_MOCK_PAGES_REPORT.md

**Date:** 2026-07-11 · **Method:** exact — pages that import a `_data/*` mock array. **121** total `(dashboard)` pages; **51** still mock; **~70 real**. (Logistics moved to real this pass.)

## Summary by module
| Module | Mock pages | Backend models exist? | Effort to complete |
|---|---|---|---|
| Governance | 18 | ✅ mostly (users/roles/permissions/audit/compliance) | **M–L** (wire to existing services) |
| Salam-Cola vertical | 17 | ❌ no bespoke domain models | **L** (needs domain design) |
| UCO vertical | 11 | ❌ no bespoke domain models | **L** (needs domain design) |
| Inventory (adjustments/movements/transfers) | 3 | ✅ (stock-movement models) | **M** (need movement records + write flows) |
| Finance (close/history, treasury/reconciliation) | 2 | ✅ (close runs, bank statements) | **M** (need close-run + bank-statement data) |

## Exact list
| Route | Module | Reason mock | Backend exists | Effort |
|---|---|---|---|---|
| `/finance/close/history` | Finance | no close-run history seeded | ✅ | M |
| `/finance/treasury/reconciliation` | Finance | needs imported bank statements | ✅ | M |
| `/inventory/adjustments` | Inventory | needs stock-adjustment records | ✅ | M |
| `/inventory/movements` | Inventory | needs stock-movement ledger | ✅ | M |
| `/inventory/transfers` | Inventory | needs transfer records | ✅ | M |
| `/governance/approvals/{inbox,pending,history,delegated}` | Governance | approval engine not wired to UI | ✅ | M |
| `/governance/audit/{trail,documents,sensitive,close-events}` | Governance | audit-log query not wired | ✅ | M |
| `/governance/compliance/{gst,ewb,exceptions,jobs,tasks}` | Governance | compliance jobs not wired | 🟡 | M–L |
| `/governance/security/{users,roles,permissions,events,reviews}` | Governance | RBAC admin UI not wired (data model exists) | ✅ | M |
| `/salam-cola/assets/{coolers,maintenance,placements,pos}` | Salam-Cola | no cooler/asset-placement domain | ❌ | L |
| `/salam-cola/distribution/{distributors,territories,coverage,schemes}` | Salam-Cola | no distribution domain | ❌ | L |
| `/salam-cola/manufacturing/{batches,contractors,partners,suppliers,traceability}` | Salam-Cola | no manufacturing domain | ❌ | L |
| `/salam-cola/marketing/{campaigns,influencers,sampling,branding,roi}` | Salam-Cola | no marketing domain | ❌ | L |
| `/uco/{sources,barrels,quality,customers}` | UCO | no UCO collection domain | ❌ | L |
| `/uco/collections/{scheduled,pending,missed,completed}` | UCO | no collection-run domain | ❌ | L |
| `/uco/routes` + `/uco/routes/{stops,exceptions,efficiency}` | UCO | no route domain (generic logistics exists instead) | ❌ | L |

## Notes
- **Governance (18)** is the highest-leverage next target: the backends/services largely exist; these are
  UI-wiring tasks, not new domains.
- **Salam-Cola (17) & UCO (11)** are bespoke *vertical* screens with **no domain models**. They are demoed
  **through the generic ERP** (finance/inventory/procurement/sales/logistics, all real). Building them as real
  requires designing those domains first — a product decision, not just wiring.
- **Inventory 3 / Finance 2** need transactional records (stock movements, bank statements, close runs) — medium
  effort, on the generic-ERP path.

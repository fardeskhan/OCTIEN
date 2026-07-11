# BUTTON_AUDIT_REPORT_FINAL_V2.md

**Date:** 2026-07-11 · **Method:** counted every `<Button>` / `buttonVariants()` control across `(dashboard)` and classified by page data-source.

## Totals
| Metric | Count |
|---|---|
| **Total button controls** (`(dashboard)`) | **143** |
| **Working** (navigate / submit / server action / print / drawer / filter) | **~72** |
| **Broken** (error / dead-end) | **0** |
| **Placeholder** (render only, on still-mock pages) | **~71** (governance 30, salam-cola 23, uco 18) |

"Broken = 0" means no button throws or 404s. "Placeholder" buttons render on the still-mock vertical/governance
screens; they don't error, they just aren't wired to a backend yet. Every button on a **real** page works.

## Working controls by area (all verified this program)
| Area | Controls |
|---|---|
| Inventory | New Product → **create → default variant → variants page** (404 fixed), Open Product, **Manage Variants**, **Add/Edit/Delete Variant**, search, status filter, pagination |
| Sales | New Customer (create), New Invoice (**create with line items + GST + partial pay**), invoice link → preview, search/filter/paginate |
| Invoice preview | template switch, Print, Download PDF, **Mark Paid**, **Void**, **Delete** |
| Procurement | New Supplier, Create PO, Open Supplier, search/filter, create forms |
| Business | Create/Edit/Save, Suspend/Archive/Restore, logo upload, color pickers |
| Finance | Print/PDF on every statement, section nav, badges |
| **Logistics (now real)** | Control-tower nav, **E-Way: Create Draft / Generate / Cancel**, route-map, run/stop/fleet views |
| Global | business switcher (switch/manage/create), DataTable search + status filter + pagination |

## Filters / search / pagination
Every **real** list uses the shared `DataTable` toolbar → **working global search + auto status-filter
dropdown + record count + pagination**. The decorative `FilterBar` was removed from all real lists.

## Fixed since V1
- **Product → Variants 404** — redirect corrected + variants route + variant CRUD built.
- **Invoice Void / Delete** added (plus Mark Paid).
- **Logistics buttons** (E-Way generate/cancel/create) now functional via the provider.

## Remaining placeholder controls (off core path)
Governance (30), Salam-Cola (23), UCO (18) — on the 51 still-mock pages (see REMAINING_MOCK_PAGES_REPORT.md).
These are the wiring/vertical-domain backlog; none crash.

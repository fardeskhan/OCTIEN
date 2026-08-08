# OCTIEN Data Table Guidelines

Tables are the core of an ERP. One implementation: **`EnterpriseDataTable`** (interactive, client) and
**`EnterpriseReportTable`** (config-driven, print/export-oriented). Never hand-roll `<table>` in a page.

## When to use which
- **`EnterpriseDataTable`** — operational lists with row actions, selection, inline interaction (orders, invoices, suppliers, stock).
- **`EnterpriseReportTable`** — config columns `{key, header, format: text|money|number|status}` for registers/reports with search + print + CSV. Thin pages (~30 lines).

## Anatomy
Toolbar (title/count · search · filters · density · column visibility · export · primary action) →
sticky header → rows → footer (pagination · selection summary). Everything on the token grid.

## Columns
- **Order:** identity (code/name) → key attributes → status → **numbers (right) → actions (far right)**.
- **Numbers** right-aligned, `tabular-nums`, currency via `formatINR`. **Text/status** left-aligned. **Codes/IDs** `font-mono text-xs`.
- **Header:** `text-xs font-medium text-muted-foreground`, sortable headers show a chevron on hover/active.
- **Truncation:** long text truncates with title tooltip; never wrap unpredictably in dense mode.
- **Pinned columns:** identity column pins left, actions pin right on horizontal scroll (wide tables).
- **Column visibility & resize:** offered on operational tables; identity + actions are non-hideable.

## Density
Single control, default **Comfortable**. Compact `py-1.5` · Comfortable `py-2` · Relaxed `py-3`. Row
padding changes only; type stays `text-sm`. Persist the user's choice per table (client pref).

## Rows & interaction
- Row height stable per density; zebra is **off** by default (use hairline `divide-border`); hover = `bg-muted/50`.
- Whole row navigates to detail when there's a canonical destination (cursor-pointer + keyboard `Enter`); explicit actions live in a right-aligned `MoreHorizontal` menu — stop propagation.
- **Selection:** checkbox column (header = select-all-visible) → selection bar appears with bulk actions; `Esc` clears.
- Status via `EnterpriseStatusBadge` (semantic color + glyph), never raw colored text.

## States (all four, always)
- **Loading:** `EnterpriseSkeleton` rows matching column layout (not a spinner).
- **Empty:** `EnterpriseEmptyState` — icon, one-line reason, and the primary create action if applicable.
- **Error:** inline error card with retry; never a blank table.
- **Filtered-empty:** distinct copy ("No results for these filters") + "Clear filters".

## Sorting / filtering / search / pagination
- Client sort for loaded pages; server sort for large sets (keep the same header UX).
- Filters live in `EnterpriseFilterBar` (search + status + facets). Applied filters show as removable chips.
- Search is debounced (~200ms), matches visible text columns, case-insensitive.
- Pagination: page size 25 default (10/25/50/100); show "1–25 of N"; keyboard `←/→` when focused.

## Export & print
`EnterpriseExportMenu` (CSV now; PDF/XLSX later) exports the **current filtered/sorted view**.
`EnterpriseReportLayout` provides a clean print stylesheet (chrome hidden via `print:hidden`).

## Accessibility
Real `<table>` semantics (`th[scope]`, `caption`/aria-label) · sortable headers are `<button>` with
`aria-sort` · row selection announced · full keyboard: Tab to cells/controls, `Enter` activates,
arrow-key cell nav on dense grids · focus-visible rings · respects reduced-motion.

## Responsive
Wide tables scroll horizontally inside their own `overflow-x-auto` container (page never scrolls
sideways) with pinned identity/actions. Below `md`, non-essential columns collapse into a stacked
"key: value" card row per record; primary action stays reachable.

## Never
Hand-rolled tables · hardcoded colors/px · color-only status · wrapping numbers · spinner-only loading
· losing filters on navigation · more than one primary action in the toolbar.

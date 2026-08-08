# OCTIEN Component Guidelines

The `Enterprise*` kit (`components/enterprise/*`) is the **only** import surface for app screens. It
wraps shadcn/base-ui primitives with OCTIEN defaults. Screens compose components; they never
re-implement markup or hold business logic.

## Foundations
- **Primitives:** shadcn/ui on **base-ui** (`components/ui/*`): button, card, dialog, sheet,
  dropdown-menu, tabs, tooltip, input, label, checkbox, table, scroll-area, separator, progress,
  avatar, skeleton, sonner (toast), badge, form. Charts via `ui/chart-wrappers` (`StandardBar/Line/AreaChart`).
- **Kit:** `enterprise/{data,feedback,forms,layout,security}` + report-layout/report-table,
  print-button, audit-timeline. Re-exports the battle-tested `DataTable`/`FilterBar`/`KPICard`.
- **Rule:** import from `@/components/enterprise` (not deep primitive paths) in pages. Reserve
  `@/components/ui/*` for building *inside* the kit.

## Current inventory (real) vs directive targets
| Concept | Exists as | Status |
|---|---|---|
| Page wrapper / header / section | `EnterprisePage`, `EnterprisePageHeader`, `EnterpriseSection` | ✅ |
| KPI / metric grid | `EnterpriseKPIRow` + `EnterpriseStatCard` (KPICard) | ✅ (add `EnterpriseMetricGrid` alias) |
| Card / summary card | `Card` (ui) | ⚠ wrap as `EnterpriseCard` for consistent padding/elevation |
| Chart card | `Standard*Chart` + `Card` | ⚠ build `EnterpriseChartCard` (title, actions, chart slot) |
| Data table | `EnterpriseDataTable` (ui/data-table) | ✅ (see DATA_TABLE_GUIDELINES) |
| Report table/layout | `EnterpriseReportTable`, `EnterpriseReportLayout` | ✅ |
| Status badge | `EnterpriseStatusBadge` | ✅ |
| Empty / skeleton / loading | `EnterpriseEmptyState`, `EnterpriseSkeleton` | ✅ (add `EnterpriseLoading` spinner-block) |
| Filter bar / search | `EnterpriseFilterBar` | ✅ (extract `EnterpriseSearch` input) |
| Confirm / modal / drawer | `EnterpriseConfirmDialog`, `Dialog`, `Sheet` | ⚠ standardize `EnterpriseModal`/`EnterpriseDrawer` wrappers |
| Toast | `sonner` | ⚠ expose `EnterpriseToast` helper |
| Timeline / audit | `EnterpriseAuditTimeline` | ✅ (generalize `EnterpriseTimeline`) |
| Tabs / pagination / export | `Tabs`, table pagination, `EnterpriseExportMenu` | ✅ (add `EnterpriseTabs`, `EnterprisePagination` wrappers) |
| Print | `EnterprisePrintButton`, `EnterpriseReportLayout` print | ✅ |
| Command palette | — | ❌ **build** (`EnterpriseCommandPalette`, ⌘K) |
| Breadcrumb / toolbar | — | ❌ **build** (`EnterpriseBreadcrumb`, `EnterpriseToolbar`) |
| Activity feed / quick actions | — | ❌ **build** (`EnterpriseActivityFeed`, `EnterpriseQuickActions`) |

> Phase 3 = close the ⚠/❌ rows into **one implementation each**, then migrate pages. Never fork.

## Component contracts (apply to all)
- **Tokens only.** Colors/spacing/radius/elevation come from tokens. No hex/px in a component.
- **Controlled where it matters; sensible defaults elsewhere.** Props are minimal and typed; avoid boolean explosions — prefer a `variant`/`size` union.
- **Composition over configuration.** Slots (`children`, `actions`, `header`) beat 20 props.
- **States built-in.** Interactive/data components handle hover/active/focus-visible/disabled and loading/empty/error.
- **A11y baked in.** Correct roles, labels, focus management, keyboard. Dialog/drawer trap focus + restore + `Esc`.
- **Dark-mode correct** by construction (tokens), verified per component.
- **No logic.** Data fetching/mutation lives in server components/actions/services, passed in as props.

## Buttons (canonical hierarchy)
`primary` (one per view) · `secondary` (neutral) · `outline` (bordered) · `ghost` (toolbar/table row)
· `destructive` (guarded) · `link`. Sizes `sm`(28px)/default(32–36)/`lg`. Icon-only ≥32px + aria-label.
Loading = disabled + inline spinner, label retained.

## Elevation & radius recipe
Canvas (`background`) → **Card** `bg-card border border-border rounded-lg shadow-sm` → **Popover/Menu**
`bg-popover shadow-md rounded-md` → **Dialog/Drawer** `shadow-lg rounded-xl`. Inputs/badges/buttons
`rounded-md`. Never mix radii within one component cluster.

## Definition of done (per component)
Tokens ✓ · variants/sizes ✓ · all states ✓ · keyboard + focus-visible ✓ · AA contrast ✓ · dark ✓ ·
responsive ✓ · one implementation (no duplicate) ✓ · used by ≥1 real screen ✓.

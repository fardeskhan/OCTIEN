# OCTIEN Dashboard Guidelines

Every dashboard must feel **executive-level**: instant answer to "how is the business doing?",
strong hierarchy, generous whitespace, professional charts, zero clutter. (Redesign of dashboards is
Phase 4 — this doc governs them.)

## Layout order (top → bottom)
1. **Page header** — module title + timeframe/context + one primary action (`EnterprisePageHeader`).
2. **Alerts row** (only if present) — compact chips for things needing attention (overdue, failed events, low stock). Danger/warning/info tones; disappears when clean.
3. **Executive KPIs** — the 4–8 numbers that matter (`EnterpriseKPIRow` of `EnterpriseStatCard`).
4. **Trends** — 1–2 primary charts (revenue/collections, purchases/payments) side by side.
5. **Breakdowns** — distribution chart + a ranked list (aging buckets + top overdue; value by warehouse + summary).
6. **Operations** — secondary counters (pending X, awaiting Y).
7. **Top lists / activity** — top customers/suppliers/products, recent documents, activity feed.

Rhythm: `space-y-6` between rows; grids `gap-4`. Full-width; no fixed narrow container.

## KPI / stat cards
- `EnterpriseStatCard`: label `text-xs text-muted-foreground` · value `text-2xl/3xl font-semibold tabular-nums` · optional delta (arrow + %) colored by direction (success/destructive) — **shape not color alone**.
- One idea per card. Currency via `formatINR`; counts via `formatNumber`. Optional tiny sparkline, no axes.
- Grid: `grid gap-4 sm:grid-cols-2 lg:grid-cols-4` (or `xl:grid-cols-8` for 8-up). Cards equal height.
- A KPI may carry a status `variant` (destructive when overdue>0) — used sparingly.

## Charts
- Use `Standard{Bar,Line,Area}Chart` (chart-wrappers). Palette from `chart-1…6`, **starting at chart-1**; primary metric = `chart-1` (blue).
- Wrap in `EnterpriseChartCard` (title, optional action/legend, chart slot, consistent `p-4`/height ~220–260).
- Minimal ink: thin gridlines (`border`), no 3D, no heavy fills (area uses low-opacity token fill), concise axis labels, tooltips on hover. Bar for categorical, line for trend, area for cumulative.
- Never encode meaning by hue alone; label series; ensure dark-mode legibility (tokens handle this).
- Empty chart → `EnterpriseEmptyState` inside the card, not a broken axis.

## Lists & feeds
- Ranked lists: label left (truncate) + value right (`tabular-nums`), max 5–8 rows, "View all" link.
- `EnterpriseActivityFeed`: newest-first, icon + actor + object + relative time; groups by day.

## Hierarchy & restraint
- The eye should land on KPIs first, then trends. Achieve with size + space, not color.
- One primary action in the header; everything else is quiet.
- No more than ~2 accent colors visible beyond blue; status colors only where earned.
- Whitespace is the layout tool — don't box every widget; use cards for genuine grouping only.

## States & performance
- Each widget: loaded / empty / error / loading (skeleton matching its shape).
- Dashboards reuse **verified read-model services** (no recompute in the page); server-render KPIs, hydrate charts.
- Heavy widgets stream/suspend independently so the shell paints fast.

## Responsive
Desktop 4-up KPIs + 2-col charts → tablet 2-up KPIs + stacked charts → mobile 1-up, charts full-width,
lists collapse. Never a horizontal page scroll.

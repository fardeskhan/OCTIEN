# OCTIEN Spacing System

One rhythm everywhere. Tailwind's 4px base scale is the **only** spacing source — no arbitrary
`px` values. Consistent spacing is what makes an ERP feel calm and cohesive.

## Scale (4px base)
`0.5=2 · 1=4 · 2=8 · 3=12 · 4=16 · 5=20 · 6=24 · 8=32 · 10=40 · 12=48 · 16=64` (px).
Prefer even steps (2/4/6/8). Avoid 5/7/9/11 unless matching an optical need.

## Standard measurements
| Context | Value |
|---|---|
| Page gutter (content padding) | `px-6 py-6` (24) desktop · `px-4 py-4` mobile |
| Vertical rhythm between page sections | `space-y-6` (24) |
| Card padding | `p-4`–`p-6` (16–24); compact cards `p-3` |
| KPI card padding | `p-4` (16) |
| Table cell padding | `px-3 py-2` (comfortable) · `px-3 py-1.5` (compact) |
| Form field vertical gap | `space-y-4` (16); grouped rows `gap-3` |
| Inline control gap (icon+label, button row) | `gap-2` (8) |
| Sidebar item padding | `px-3 py-2` (12/8); icon-label gap `gap-3` |
| Toolbar / filter bar | `gap-2` items, `py-3` band |
| Modal/drawer padding | `p-6` (24); header/footer `px-6 py-4` |

## Density
Three table densities via a single control (default = comfortable):
- **Compact** `py-1.5` — power users, dense ledgers.
- **Comfortable** `py-2` — default.
- **Relaxed** `py-3` — presentation/read.
Density changes row padding only; type size stays `text-sm` for stability.

## Layout grids
- Content max-width for reading/forms: `max-w-3xl`–`max-w-5xl`; data tables/dashboards go full-width.
- KPI rows: `grid gap-4` responsive `sm:grid-cols-2 lg:grid-cols-4` (or `-6` for 6-up).
- Dashboard chart grid: `grid gap-4 lg:grid-cols-3` (charts `lg:col-span-2`, side panel `col-span-1`).
- Two-pane detail: content `flex-1` + rail `w-80`/`w-96`.

## Alignment rules
1. Everything snaps to the 4px grid — no `top-[7px]`.
2. Optical alignment for icons: `size-4` icon + `gap-2` to label; icons vertically centered to text.
3. Right-align numbers, left-align text, in the same column set.
4. Consistent gutters: a page's left content edge aligns with its header's left edge.
5. Whitespace is a feature — when unsure, add space, don't add lines/borders.

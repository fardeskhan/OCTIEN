# OCTIEN Iconography

**Lucide is the only icon library.** One family, one stroke, one grammar. No emoji as UI, no mixed
icon sets, no filled/duotone packs.

## Sizing (tied to the 4px grid)
| Context | Class | px |
|---|---|---|
| Inline with text / buttons / table cells | `size-4` | 16 |
| Sidebar nav, toolbar, most affordances | `size-4`–`size-5` | 16–20 |
| Section/card headers, empty-state accent | `size-5`–`size-6` | 20–24 |
| Large empty state / illustration | `size-8`–`size-10` | 32–40 |
| KPI/stat accent | `size-4`–`size-5` in a tinted chip | 16–20 |

Default in-UI icon is **16px** (`size-4`). Never exceed 24px except empty states/illustrations.

## Stroke & color
- Keep Lucide's default stroke (`stroke-width` 2 for ≤20px, 1.75 acceptable at ≥24px). Do not mix widths.
- Icons inherit `currentColor` — color via text tokens: `text-muted-foreground` (default/quiet),
  `text-foreground` (active), `text-primary` (brand/selected), `text-success|warning|destructive` (status only).
- Never hardcode icon color; never use a brand hex on an icon.

## Spacing & alignment
- Icon + label: `inline-flex items-center gap-2` (8px). Icons vertically centered to the text baseline optically.
- Icon-only controls: minimum **32×32** hit target (`size-8` button, `size-4` glyph inside), always with `aria-label` + tooltip.
- Leading icons in inputs sit `left-3`, `size-4`, `text-muted-foreground`.

## Semantic icon vocabulary (use consistently)
Search `Search` · Filter `Filter`/`SlidersHorizontal` · Add `Plus` · Edit `Pencil` · Delete `Trash2`
· More `MoreHorizontal` · Close `X` · Success `CheckCircle2` · Warning `AlertTriangle` · Error
`XCircle` · Info `Info` · Money/finance `Banknote`/`Receipt` · Inventory `Package`/`Boxes` · Sales
`ShoppingCart` · Procurement `PackageCheck` · Export `Download` · Import `Upload` · Print `Printer` ·
Settings `Settings` · User `User`/`CircleUser` · Notifications `Bell` · Theme `Sun`/`Moon` · Nav
chevrons `ChevronRight`/`ChevronDown` · External `ArrowUpRight` · Trend up/down
`TrendingUp`/`TrendingDown`. **One concept → one icon, app-wide.** Additions go in this list.

## Rules
1. Decorative icons get `aria-hidden="true"`; meaningful icon-only controls get `aria-label`.
2. Direction/trend must not rely on color alone — pair arrow shape with the value.
3. No icon inside a `primary` button unless it clarifies the action (e.g. `Plus` + "New Invoice").
4. Status uses the semantic glyph **and** the semantic color together (see `EnterpriseStatusBadge`).

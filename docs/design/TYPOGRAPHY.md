# OCTIEN Typography

Data-first, compact, legible for 8-hour days. Font: the app sans (`--font-sans`, set in the root
layout) with `--font-mono` for code/IDs. Scale is defined in `globals.css` `@theme`.

## Scale & roles
| Token | px / line | Role |
|---|---|---|
| `text-4xl` | 36 / 44 | Display — marketing/splash only |
| `text-3xl` | 30 / 38 | H1 — page title (rare; most pages use PageHeader at 20–24) |
| `text-2xl` | 24 / 32 | H2 / large KPI metric |
| `text-xl` | 20 / 28 | H3 / section title / KPI metric |
| `text-lg` | 16 / 24 | H4 / card title / emphasized body |
| `text-base` | 14 / 20 | **Body default** |
| `text-sm` | 13 / 18 | Table cells, dense body, secondary |
| `text-xs` | 12 / 16 | Labels, captions, metadata, badges |
| `text-2xs` | 11 / 14 | Micro-labels (column headers, chips) — use sparingly |

## Weights
`font-normal` (400) body · `font-medium` (500) labels, table headers, nav · `font-semibold` (600)
titles, KPI values, emphasis. Avoid 700+ except display. Never use weight alone to convey status.

## Roles in practice
- **Page title:** `EnterprisePageHeader` — `text-xl`/`text-2xl` `font-semibold tracking-tight`.
- **Section title:** `text-sm font-medium` uppercase-optional, `text-muted-foreground` for quiet sections.
- **KPI value:** `text-2xl`/`text-3xl` `font-semibold tabular-nums`; label `text-xs text-muted-foreground`.
- **Table:** header `text-xs font-medium text-muted-foreground`; cell `text-sm`; numeric cells `tabular-nums` right-aligned.
- **Caption/help:** `text-xs text-muted-foreground`.

## Numeric rules (critical for an ERP)
- All amounts, quantities, dates-in-columns, and metrics use **`tabular-nums`** for column alignment.
- Currency/quantity cells are **right-aligned**; labels left-aligned.
- Use `text-mono`/`font-mono` for codes, IDs, references (`INV-…`, SKUs, hashes).

## Rules
- `tracking-tight` on titles ≥ `text-lg`; default tracking elsewhere.
- Line length for prose ≤ ~72ch; ERP is mostly tabular, so this rarely applies.
- One H1 per page (semantic). Heading level ≠ size — pick size for hierarchy, level for structure.

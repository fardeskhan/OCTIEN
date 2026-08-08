# OCTIEN Color System

Identity: **Blue · White · Black.** All colors are authored in **OKLCH** in
`apps/frontend/src/globals.css` for perceptual uniformity and reliable contrast. Consume via Tailwind
tokens (`bg-primary`, `text-muted-foreground`, `border-border`) — **never hardcode hex in components.**

## Why OKLCH
`oklch(L C H)` — L = perceived lightness (0–1), C = chroma, H = hue. Hue **256** is the OCTIEN blue
axis; neutrals carry a faint blue chroma (0.006–0.02) so grays feel cool and cohesive, not muddy.
Adjusting L moves contrast predictably — how the palette guarantees AA across both themes.

## Roles
| Token | Role |
|---|---|
| `background` / `foreground` | App canvas / primary text |
| `card`, `popover` | Elevated surfaces (content sits above canvas) |
| `muted` / `muted-foreground` | Quiet fills / secondary text |
| `accent` / `accent-foreground` | Hover/selected surface tint |
| `secondary` | Neutral button / chip surface |
| `primary` (+`-foreground`,`-hover`,`-active`) | Brand + the **one** primary action per view |
| `primary-subtle` (+`-foreground`) | Low-emphasis brand fills (active nav, badges) |
| `border` / `border-strong` / `input` / `ring` | Hairlines / emphasized dividers / field borders / focus ring |
| `success` `warning` `destructive` `info` (+`-foreground`,`-subtle`) | Semantic status |
| `chart-1…6` | Categorical data series |

## Palette (values in `globals.css`)
**Light** — canvas near-white `oklch(0.994 0.001 256)`, cards pure white, text `oklch(0.21 0.02 256)`
(soft black, not #000). **OCTIEN blue** primary `oklch(0.548 0.176 256)` ≈ a confident mid-blue.
**Dark** — a *designed* enterprise dark, not an inversion: canvas soft blue-black
`oklch(0.17 0.014 256)`, cards deep blue-gray `oklch(0.208 0.017 256)`, text `oklch(0.955 0.006 256)`,
primary brightened to `oklch(0.63 0.168 256)` so it pops without glare. Borders are solid blue-gray
(`0.3 0.02 256`) for calm separation.

## Status semantics (use sparingly — color is earned)
- **success** green 150° — completed, paid, healthy, positive delta.
- **warning** amber 72–76° — attention, pending approval, low stock.
- **destructive** red 22–25° — overdue, error, failed, delete.
- **info** blue 236° — neutral notice (distinct from brand primary 256°).
- Prefer the **`-subtle` background + solid foreground** pairing for badges/banners
  (`bg-warning-subtle text-warning`) — never full-saturation blocks of color.

## Chart palette (`chart-1…6`)
Blue-led categorical order: **blue → teal → violet → green → amber → rose.** Start every chart at
`chart-1`; add hues only as series require. Sequential/heat scales derive from a single hue (256)
varying L. Never encode meaning by hue alone — pair with labels/patterns (a11y).

## Contrast (WCAG 2.2 AA — verified by construction)
| Pair | Ratio | Meets |
|---|---|---|
| `foreground` on `background` (light) | ~15:1 | AAA |
| `muted-foreground` on `background` (light) | ~4.7:1 | AA (body/secondary) |
| `primary-foreground` on `primary` | ≥ 4.5:1 | AA |
| `foreground` on `background` (dark) | ~14:1 | AAA |
| `muted-foreground` on `background` (dark) | ~5.5:1 | AA |
Focus ring uses `ring` (= primary) at ≥ 3:1 against adjacent surfaces. Any new pairing must be
re-checked before use; large/bold text may use AA-large (3:1).

## Rules
1. Components read tokens only. A raw hex in a component is a bug.
2. Blue is for **identity + the single primary action**. Extra blue = noise.
3. Status color communicates state, never decorates.
4. Dark values are authored independently — never `invert()`.
5. New color? Add a token here + in `globals.css` (both themes), verify contrast, then use it.

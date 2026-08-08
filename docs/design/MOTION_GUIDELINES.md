# OCTIEN Motion Guidelines

Motion in OCTIEN is **functional, fast, and quiet** — it explains state change and directs attention,
never decorates. In an 8-hour tool, excess motion is fatigue. Powered by `tw-animate-css` + Tailwind
transitions; base-ui handles enter/exit for overlays.

## Durations & easing
| Motion | Duration | Easing |
|---|---|---|
| Hover / focus / button feedback | 100–150ms | `ease-out` |
| Dropdown / popover / tooltip | 120–160ms | `ease-out` (in), `ease-in` (out) |
| Dialog / drawer / sheet | 180–240ms | standard/decelerate |
| Accordion / expand / collapse | 160–200ms | `ease-out` |
| Toast in/out | 160–220ms | `ease-out` |
| Page/route transition | ≤ 200ms, opacity/short translate only | `ease-out` |
| Skeleton shimmer | ~1.2s loop, very low contrast | linear |

Nothing exceeds **~250ms**. If it feels like an animation, it's too slow.

## Property rules
- Animate **`transform` (translate/scale) and `opacity` only** — GPU-friendly, no layout thrash. Avoid animating width/height/top/left except small accordions (grid-rows trick or measured height).
- Elevation on hover: raise `shadow-sm → shadow-md` + optional `-translate-y-px`, subtle.
- Movement is small: overlays slide/scale ≤ 8px / 0.98–1.0. No big flys, bounces, springs, or parallax.
- One thing moves at a time; no staggered cascades on data-heavy screens.

## Patterns (allowed)
Hover elevation · button press (scale 0.98 active) · dropdown/popover fade+scale from origin · drawer
slide from edge · accordion height · tab underline slide · toast slide-in · skeleton shimmer · optimistic
row insert (fade+slide 1 row) · number tick on KPI update (optional, ≤300ms, off if reduced-motion).

## Forbidden
Decorative background motion · animated gradients · looping/idle animations · parallax · confetti ·
bounce/elastic easings · long page transitions · motion that blocks interaction · anything that moves
without a state change behind it.

## Reduced motion (non-negotiable)
`globals.css` globally reduces animation/transition to ~0 under `prefers-reduced-motion: reduce`.
Additionally: never convey information by motion alone; overlays still appear (just without slide);
auto-advancing/looping motion is fully disabled. Test every new interaction with reduced-motion on.

## Performance
Prefer CSS transitions/keyframes over JS. Overlays use base-ui's built-in transitions. No animation on
long lists/tables per-row except a single optimistic insert. 60fps or don't ship it.

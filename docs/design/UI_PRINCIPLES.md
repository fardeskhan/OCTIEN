# OCTIEN UI Principles

Decision heuristics for every screen. When a choice isn't covered by a token or component spec, these
resolve it. Optimised for an ERP used **8+ hours/day**: calm, fast, unambiguous.

## The ten principles
1. **Clarity over cleverness.** The user must always know where they are, what they're looking at, and what to do next. Never trade comprehension for visual novelty.
2. **Data is the hero; chrome recedes.** Numbers, tables, and status get the contrast and space. Navigation, borders, and decoration are quiet.
3. **One primary action per view.** Exactly one filled `primary` button in the eyeline. Everything else is `secondary`/`ghost`/`outline`. If two things compete, one is wrong.
4. **Progressive disclosure.** Show the 80% path first; put advanced options behind "More", drawers, or expanders. Dense ≠ cluttered.
5. **Consistency is a feature.** The same action looks and behaves identically everywhere. A supplier row, a customer row, and an item row share one interaction grammar.
6. **Calm color.** Blue = identity + primary action. Status color is *earned* by state (overdue, failed, low). Ambient color is noise.
7. **Respect the 4px grid and the token scale.** No arbitrary spacing, radius, or hex. If a value isn't a token, it's a bug.
8. **Fast is a design goal.** Skeletons over spinners, optimistic UI where safe, virtualized long lists, static assets out of the bundle. Perceived speed is UX.
9. **Accessible by default.** Keyboard-first, visible focus, AA contrast, semantic HTML, reduced-motion. Accessibility is not a pass at the end — it's the default state.
10. **Honest empty/error/loading states.** Every data surface designs all four states (loaded, empty, error, loading). Never a blank rectangle.

## Heuristics (when unsure)
- **Add space, not lines.** Prefer whitespace to dividers; use a border only when grouping truly needs it.
- **One elevation step at a time.** Canvas → card (`shadow-sm`) → popover/drawer (`shadow-lg`). Don't stack shadows.
- **Text beats icon-only** for anything ambiguous; icon-only is allowed only for universally-understood actions (close, search, more) and must have an `aria-label` + tooltip.
- **Right-align numbers, left-align text.** Always. Tabular figures for both.
- **Destructive actions are guarded** (`EnterpriseConfirmDialog`) and never the default focus.
- **Density is the user's choice**, not the designer's — offer compact/comfortable, default comfortable.
- **Reuse before creating.** If an `Enterprise*` component exists, use it. If it *almost* fits, extend it. Only build new when nothing composes.

## Anti-patterns (never ship)
Toy-like UI · rainbow status · heavy gradients/glassmorphism as decoration · oversized controls ·
inconsistent spacing/radius · icon soup · modal-on-modal · flashy motion · blocking spinners for fast
loads · color-only status encoding · hardcoded hex/px · business logic in components.

## The "does it belong in OCTIEN?" test
Before shipping a screen, it must pass all five: **(1)** Could it sit next to any other OCTIEN screen
and look like the same product? **(2)** Is there exactly one primary action? **(3)** Does every color
earn its place? **(4)** Does it work in dark mode and at 320px? **(5)** Can it be driven entirely by
keyboard? If any answer is "no", it's not done.

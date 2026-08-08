# OCTIEN Accessibility (WCAG 2.2 AA)

Accessibility is a **default state**, not a final pass. Target: **WCAG 2.2 Level AA** across the whole
product, both themes. An ERP is a professional tool — keyboard operability and readability are core UX.

## Contrast (AA)
- Body/UI text ≥ **4.5:1**; large/bold (≥18.66px bold / 24px) ≥ **3:1**; UI components & focus
  indicators ≥ **3:1** against adjacent colors. The token palette is built to pass (see COLOR_SYSTEM).
- Status must not rely on color alone — pair with icon/label/shape (badges, deltas, chart series).
- Don't place text on busy imagery; keep the official raster logo to brand moments only.

## Keyboard (full operability — WCAG 2.1.1)
- Everything actionable is reachable and operable by keyboard in a logical order; no keyboard traps (2.1.2).
- Standard keys: `Tab`/`Shift+Tab` move, `Enter`/`Space` activate, arrows within composites (menus, tabs, grids), `Esc` closes overlays.
- **Focus visible** (2.4.7) on every interactive element via `ring`/`outline` — never `outline:none` without a replacement.
- **Focus not obscured** (2.2 new 2.4.11): sticky headers/toolbars must not cover the focused element; scroll focus into view.
- Global shortcuts (⌘K palette, etc.) are discoverable (help/shortcuts panel) and don't override AT keys.
- **Dragging alternatives** (2.5.7): any drag (reorder, resize) has a keyboard/click alternative.
- **Target size** (2.5.8): interactive targets ≥ 24×24 CSS px (we use ≥32 for icon buttons).

## Focus management (overlays)
Dialog/drawer/menu: trap focus while open, focus the first sensible element on open, **restore focus**
to the trigger on close, `Esc` closes, background inert (`aria-hidden`/inert). Toasts don't steal focus.

## Semantics & ARIA
- Native elements first (`button`, `a`, `table`, `label`, `fieldset`). ARIA only to fill gaps, never to replace semantics.
- One `<h1>` per page; headings nested logically; landmarks (`header`/`nav`/`main`/`aside`) present in the shell.
- Tables: `th[scope]`, caption/aria-label, `aria-sort` on sortable headers, selection state announced.
- Forms: labels associated, errors via `aria-invalid` + `aria-describedby`, required via `aria-required`.
- Icon-only controls: `aria-label`; decorative icons/images: `aria-hidden`/empty `alt`.
- Live regions (`aria-live="polite"`) for async results, toasts, and inline validation summaries.

## Motion & timing
- Honor `prefers-reduced-motion` globally (implemented in `globals.css`); no info by motion alone (2.3.3).
- No unexpected auto-updates that move focus/content; no time limits on tasks (or provide extend).

## Readability & zoom
- Support **200% zoom** and **400% reflow** (1.4.10) without loss of content/function — no horizontal page scroll; wide tables scroll within their own container.
- Respect user font-size; use `rem`/tokens, not fixed px that block scaling of body text.
- Don't disable text selection on content; maintain adequate line-height (tokens).

## Theming
Both light and dark meet AA independently (dark is authored, not inverted). Test both. `data-theme`
toggle must be keyboard-operable and persist.

## Definition of done (a11y gate per screen/component)
Keyboard-only pass ✓ · visible focus everywhere ✓ · AA contrast (both themes) ✓ · semantic
HTML/landmarks ✓ · labels + error associations ✓ · overlay focus trap/restore ✓ · reduced-motion ✓ ·
200% zoom / 400% reflow ✓ · status not color-only ✓ · screen-reader smoke (names/roles/states) ✓.

## Tooling
Lint with jsx-a11y where configured; manual keyboard pass + a screen reader (NVDA/VoiceOver) smoke on
new shell/components; axe DevTools spot-checks. Automated tools catch ~40% — the manual pass is required.

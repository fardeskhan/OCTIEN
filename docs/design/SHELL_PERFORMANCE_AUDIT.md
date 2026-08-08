# OCTIEN Shell — Performance Audit (CAP-SHELL V1.0, Phase 4)

**Scope:** the application shell only (sidebar, header, breadcrumbs, search platform, command
palette, global search, notification center, user menu, theme system, AI panel, scroll system,
mobile drawer). No backend, no module pages.

**Principle applied:** *no optimization without a measurable or clearly-reasoned benefit.* The shell
was built with memoization from the start, so this pass is mostly **confirmation** plus two targeted
fixes. Premature micro-optimizations were deliberately **not** made.

---

## 1. React rendering / context providers

Every shell provider exposes a **memoized `value`** with **stable callbacks**; nothing rebuilds the
context object on unrelated renders.

| Provider | `value` memoized | Callbacks stable | Notes |
|---|---|---|---|
| `EnterpriseSearchProvider` | ✅ `useMemo` (deps: open, query, groups, busy, searchOpen, searchSources, permissions) | ✅ `select` `useCallback([router])`; setters are stable `useState` fns | `searchSources`/`sources` are `useMemo`'d; keydown listener registered once with **functional** `setState` (no stale closure) |
| `EnterpriseNotificationProvider` | ✅ `useMemo` | ✅ all mutations `useCallback` | `visible`/`grouped`/counts are `useMemo`'d off `all`+`filter`; load has a `loadSeq` stale-response guard |
| `EnterpriseAIProvider` | ✅ `useMemo` | ✅ `useCallback` | `context` recomputes only on `pathname` change |
| `ShellChromeProvider` | ✅ `useMemo` | ✅ `toggleMobileNav` `useCallback` | minimal state (`mobileNavOpen` only) |

**Deliberately not changed (would be premature):**

- **Search/AI provider granularity.** Typing in the palette (`query`) or AI composer (`draft`)
  changes the provider value, re-rendering that panel's subtree per keystroke. This is expected and
  cheap for the current surfaces. *Documented future consideration:* when the AI backend is wired and
  conversations grow long, move `draft` to local composer state (or a dedicated context) so the
  message list doesn't re-render per keystroke. Not warranted while the panel is placeholder-only.

---

## 2. Event listeners, timers, observers — leak audit

Every listener/observer/timer in the shell has a **paired teardown**. Verified pairs:

| Source | Registered | Cleaned up | Passive |
|---|---|---|---|
| `EnterpriseScrollArea` | `scroll`, `ResizeObserver`, `rAF` | ✅ `removeEventListener` + `ro.disconnect()` + `cancelAnimationFrame` | ✅ scroll `{ passive: true }` |
| `EnterpriseSearchProvider` | `keydown` | ✅ | n/a |
| `EnterpriseNotificationBadge` / `EnterpriseAILauncher` / `EnterpriseSidebar` / `EnterpriseMobileSidebar` | `keydown` | ✅ each | n/a |
| `EnterpriseAIPanel` | `matchMedia change`, `keydown`, `pointermove`/`pointerup` | ✅ each | ✅ pointermove `{ passive: true }` (fixed, see §4) |
| `useFocusTrap` | `keydown` (capture), `setTimeout` | ✅ `removeEventListener` + `clearTimeout` | n/a |
| `useSearchController` | debounce `setTimeout` | ✅ `clearTimeout` + `reqId` stale-guard | n/a |
| `useRecent` | `octien:recent`, `storage` | ✅ both removed | n/a |

**Result:** no abandoned timers, observers, rAF loops, intervals, or subscriptions. No duplicate
registrations. No stale references (keydown handlers use functional `setState`).

---

## 3. Fix applied — AI panel resize throttle

**Finding:** the docked AI-panel resize handler called `setWidth(...)` on **every** `pointermove`.
A fast drag can fire pointermove far more often than the display refreshes, queuing a state update +
main-content reflow per event.

**Fix:** coalesce to **one `setWidth` per animation frame** (store latest `clientX`, apply in a
single `requestAnimationFrame`), and mark the listener **passive** (it never calls `preventDefault`).
Cancels the pending frame on teardown. **Benefit:** caps resize work to the frame rate, eliminating
redundant reflows during a fast drag. Behavior is unchanged.

---

## 4. Fix applied — scoped transition

**Finding:** `EnterpriseNotificationFilters` segmented control used `transition-all`, which asks the
browser to watch every animatable property.

**Fix:** narrowed to `transition-colors` (only `color`/`background`/`border` change on selection),
matching the identical `EnterpriseThemeSwitcher` segmented control. **Benefit:** removes a broad
property watch; also a consistency win.

---

## 5. Animation audit — transform / opacity only

Shell entrance animations use **only `transform` + `opacity`**:

- `octien-slide-in-left` / `octien-slide-in-right` / `octien-fade-in` (mobile drawer, AI overlay,
  backdrops) — transform + opacity.
- base-ui primitives (Dialog, Menu, Popover, Tooltip) — tailwindcss-animate `fade`/`zoom` (opacity +
  scale transform).

**Accepted exception:** `EnterpriseSidebar` animates `width` on collapse (`transition-[width]`,
200ms). This is a deliberate, user-initiated, infrequent toggle; a transform-based alternative would
clip content rather than reflow it. It is contained to one element and is disabled globally under
`prefers-reduced-motion`. Kept.

No animation of `height`, `top`, `left`, `margin`, or `padding` anywhere in the shell.

---

## 6. Layout shift / theme switching

- **Theme switching is instant** — next-themes runs with `disableTransitionOnChange`, so no
  cross-fade churn and no layout movement.
- No shell transition animates a size that would shift siblings, except the intended sidebar collapse
  (which reflows main content by design during the 200ms toggle).
- The shell is server-rendered, so there is no first-paint CLS from client hydration of chrome.

---

## 7. CSS / duplicate-system audit

One of each system, confirmed:

- **Scrollbar:** one `.scrollbar-enterprise` (the removed `.scrollbar-ghost` and the dead
  `.custom-scrollbar` are gone; 0 references remain).
- **Overlay animation:** one set (`.animate-drawer-left/right`, `.animate-overlay-fade`) — all three
  are referenced; no dead utilities.
- **Radius / elevation / spacing / typography:** design tokens in `globals.css` (`--radius-*`,
  `--shadow-*`, `--text-*`) — no ad-hoc scales.
- **Reduced motion:** one global `@media (prefers-reduced-motion: reduce)` reset neutralizes all
  animation/transition durations shell-wide.

*Note:* base-ui's ui/ primitives use tailwindcss-animate for their built-in fade/zoom; the custom
shell overlays use the `octien-*` keyframes. These are two layers (primitive vs. shell composition),
not a duplicated system, and both honor reduced motion.

---

## 8. Architecture — one implementation each

Exactly one **active** implementation of each shell capability, all under
`components/enterprise/{shell,search,notifications,ai}` and consumed by `EnterpriseShell`:

Sidebar · Header · Breadcrumbs · Global Search · Command Palette · Quick Actions · Notification
Center · User Menu · Theme Switcher · AI Panel · Scrollbar · Mobile Drawer · Search Platform.

No parallel active implementations. (Legacy files under `components/layout/*` — old `sidebar.tsx`,
`page-layout`, `workspace-layout`, `business-switcher` — are **unused dead code** slated for deletion
in **Phase 6 (Legacy Cleanup)**; they are intentionally retained until then for comparison and are
not wired into the shell.)

---

## 9. Remaining risks / follow-ups

- **AI composer keystroke re-renders** (see §1) — revisit when the AI backend + long conversations
  land; not an issue for the placeholder.
- **Sidebar width animation** (see §5) — accepted; revisit only if profiling on a heavy dashboard
  shows jank during collapse.
- **Bundle:** one dead re-export (`ArrowRight` in `EnterpriseSearchProvider`) — removal deferred to
  Phase 6 to keep this phase optimization-only.

---

## 10. Verification

- **TypeScript:** `tsc --noEmit` → 0 errors.
- **ESLint:** 0 errors.
- **Production build:** compiles successfully.
- **Manual (desktop / laptop / tablet / mobile, light + dark):** sidebar collapse, AI panel resize
  (now frame-throttled), drawer open/close, notification/search panels, and scrolling all smooth; no
  layout thrashing or forced synchronous reflow observed.

**Status:** shell performance is stable and within budget. No further optimization is justified at
this time.

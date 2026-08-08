# OCTIEN Shell — Architecture Review (CAP-SHELL V1.0)

The definitive architecture reference for the OCTIEN application shell — the frozen chrome that every
screen renders inside. Complements the design bible (`docs/design/*`), `SHELL_ARCHITECTURE.md`, and
`NAVIGATION_ARCHITECTURE.md`.

---

## 1. Overview

The shell is a **module-agnostic composition root**. It knows nothing about Sales, Finance, or any
business domain — it renders navigation from a single typed model, hosts the search/notification/AI
platforms, and provides the responsive frame (sidebar + header + scrollable main + docked AI panel).
Business screens are passed in as `children`; the shell never imports a module.

**Layer boundary:** the shell (`components/enterprise/{shell,search,notifications,ai}`) is the frozen
platform layer. The **module-page layer** (`components/layout/workspace-layout`, `drawer-layout`) is a
separate, still-evolving concern replaced per-module during redesigns — it is **not** part of the
frozen shell.

---

## 2. Component hierarchy

```
(dashboard)/layout.tsx                     server: session, businesses, permissions, workspace/role
└─ EnterpriseShell                         client composition root
   ├─ EnterpriseSearchProvider             ⌘K palette + / global-search state, one search engine
   │  └─ EnterpriseNotificationProvider    notifications state (mock→service seam)
   │     └─ EnterpriseAIProvider           AI workspace state (open/width/messages/context)
   │        └─ ShellChromeProvider         mobile-nav open state
   │           ├─ EnterpriseSidebar        [lg+] docked 280↔72 rail
   │           │  ├─ SidebarHeader / WorkspaceSwitcher / nav search
   │           │  ├─ Favorites / Navigation / Recent   (EnterpriseScrollArea)
   │           │  └─ SidebarFooter
   │           ├─ EnterpriseMobileSidebar  [<lg] off-canvas drawer (reuses EnterpriseSidebar)
   │           ├─ main column
   │           │  ├─ EnterpriseTopbar (server node)
   │           │  │  ├─ MobileNavTrigger [<lg] · Breadcrumb · SearchBar
   │           │  │  └─ QuickActions · AILauncher · NotificationBadge · ThemeSwitcher · UserMenu
   │           │  └─ <main> scrollable (children)
   │           └─ EnterpriseAIPanel        [lg] docked+resizable / [<lg] overlay sheet
   │           EnterpriseCommandPalette · EnterpriseGlobalSearch   (portaled dialogs)
```

---

## 3. Providers & state ownership

State is owned by **dedicated providers**, each exposing a memoized `value` with stable callbacks;
components are pure renderers.

| Provider | Owns | Persistence |
|---|---|---|
| `EnterpriseSearchProvider` | palette open/query/results, global-search open, source registry, permissions | — |
| `EnterpriseNotificationProvider` | notifications, unread/critical counts, filters, grouping, optimistic mutations | localStorage-ready; mock source |
| `EnterpriseAIProvider` | AI panel open, width, placeholder messages, route-derived context, draft | `octien:ai-open`, `octien:ai-width` |
| `ShellChromeProvider` | mobile-nav open | — (ephemeral) |
| hooks | favorites, recent, sidebar-collapsed, recent-searches | `octien:favorites/recent/sidebar-collapsed/recent-searches` |

**Single sources of truth:** navigation = `lib/navigation.ts`; search = one engine
(`lib/{fuzzy-search,search,search-index,entity-sources}`) consumed by both palette and global search;
favorites/recent read the **same** localStorage keys as the sidebar (no duplication).

**Service seams (mock → real, UI unchanged):** `notifications/lib/mock-notifications.ts`
(`fetchNotifications`), `search/lib/entity-sources.ts` (`makeEntitySource`), AI `lib/ai.ts`
(placeholder conversation/context). Swapping any of these for a live API requires no UI change.

---

## 4. Design system & tokens

All visual values come from `globals.css` tokens (Tailwind v4 `@theme` + `:root`/`.dark`, OKLCH):

- **Color:** OCTIEN blue identity (light `--primary #146ed4`, dark `#3a88ec`, hue 256); soft
  blue-black dark canvas (`#0b1016`); `primary/-hover/-active/-subtle`, `border(-strong)`,
  status + `-subtle`, `chart-1..6`, `*-foreground`. **0 hardcoded colors.**
- **Radius:** `--radius-sm/md/lg/xl/2xl` → panels `rounded-xl`, rows/inputs `rounded-lg`, controls
  `rounded-md`, pills `rounded-full`, bubbles/empty-frames `rounded-2xl`.
- **Elevation:** `--shadow-xs..xl` (blue-tinted) → modal/overlay `xl` > popover `lg` > dropdown `md`
  > raised control `xs`/selected pill `sm`.
- **Typography:** `--text-2xs..4xl` (compact, data-first). **0 arbitrary font sizes** — tokens only.
- **Motion:** micro-interactions 150ms / larger transitions 200ms; overlays via `octien-*`
  keyframes (transform + opacity only). One global `prefers-reduced-motion` reset.
- **Scrollbar:** one `.scrollbar-enterprise` (blue, ~5px, hidden-idle hover-reveal), applied via
  `EnterpriseScrollArea` or directly.

---

## 5. Responsive architecture

- **Sidebar:** CSS-gated — docked `<aside class="hidden lg:flex">`; below `lg` an off-canvas
  `EnterpriseMobileSidebar` (reuses `EnterpriseSidebar` forced-expanded) toggled by a hamburger,
  with backdrop + focus trap + route-change auto-close.
- **AI Panel:** JS media-query (`useMediaQuery('(min-width:1024px)')`) — docked in-flow flex sibling
  with inline `width` (`min-w-0 shrink-0`, robust) on desktop; fixed overlay sheet (`w-full sm:w-96`)
  with backdrop below `lg`.
- **Header:** flush-right 32px control cluster; search hidden `<md`; hamburger shown `<lg`.
- **Content:** `max-w-[1800px]` centered; the shell row is `overflow-hidden` so panels never cause
  page scroll.

---

## 6. Accessibility architecture

- **Landmarks:** `<aside>` (sidebar, AI), `<header>`, `<main>`, drawer `role="dialog"
  aria-modal`.
- **Focus:** base-ui Dialog/Menu/Popover trap+return natively; custom overlays (drawer, AI) use
  `useFocusTrap` (initial focus, Tab-cycle when modal, return-to-trigger). Escape closes everything.
- **ARIA:** `aria-current` (nav), `aria-expanded` (collapsibles), `aria-pressed` (AI launcher),
  `role="radiogroup"` (theme), `aria-live` (AI log), `aria-valuenow/min/max` (resize separator).
- **Contrast:** WCAG 2.2 AA verified in both themes (section labels use the full muted-foreground
  token — opacity variants fail AA in light mode).
- **Touch targets:** ≥24px (WCAG 2.5.8). **Reduced motion:** global reset.

---

## 7. Performance architecture

- Providers expose memoized values + stable callbacks; no context churn on unrelated renders.
- Every listener/observer/timer has a paired teardown; scroll is `{ passive: true }`; the AI resize
  is rAF-throttled (one `setWidth` per frame) with a passive pointermove.
- Animations are transform/opacity only (one width exception: the sidebar collapse, contained).
- Theme switching is instant (`disableTransitionOnChange`); the shell is server-rendered (no chrome
  hydration CLS). See `SHELL_PERFORMANCE_AUDIT.md`.

---

## 8. Reusable components (public shell API)

`EnterpriseShell`, `EnterpriseSidebar`, `EnterpriseTopbar`, `EnterpriseBreadcrumb`,
`EnterpriseWorkspaceSwitcher`, `EnterpriseScrollArea`, `EnterpriseQuickActions`, `EnterpriseUserMenu`,
`EnterpriseThemeSwitcher`; search surfaces; `EnterpriseNotificationProvider/Center/Badge`; AI
`Provider/Panel/Launcher`; hooks `useFavorites/useRecent/useNavigationSearch/useSidebar/useFocusTrap`.
`ui/*` primitives (button, dialog, dropdown-menu, popover, tooltip, sheet, …) on base-ui.

---

## 9. Future extension points

- **Search sources** — add a `SearchSource` (e.g. AI answers, docs) to the registry; every surface
  picks it up.
- **Notifications** — swap `fetchNotifications` for a live service / websocket; UI unchanged.
- **AI** — the panel is provider-agnostic; wire a runtime that produces `AIMessage[]` + context.
- **Entity search** — replace mock `makeEntitySource` data with live read queries.
- **New shell controls** — add to the header cluster or user menu using existing tokens/patterns.
- **Theming** — new themes = a new token block; the switcher and components need no changes.

Everything new must **reuse** these components/tokens/patterns — no new visual variants.

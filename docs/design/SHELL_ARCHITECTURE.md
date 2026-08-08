# OCTIEN Global Shell — Audit, Architecture & Component Mapping (Phase 2)

Governs the application shell every module inherits. No dashboard/module or backend changes. Built on
the Design Bible (`docs/design/*`). Steps 1–3 (this doc) precede any implementation.

---

## STEP 1 — Audit of the existing shell (evidence-based, no code)

Files: `app/(dashboard)/layout.tsx`, `components/layout/{sidebar,topbar,theme-toggle,business-switcher,user-menu,workspace-layout,page-layout,drawer-layout}.tsx`.

| # | Weakness (observed) | Why it's a weakness · UX · Consistency · Scalability impact |
|---|---|---|
| 1 | **Flat, hardcoded 12-item nav** in `sidebar.tsx` (`navigation[]`), no groups | **Why:** operations, finance, business-units and admin are one undifferentiated list. **UX:** no scent/hierarchy — users scan 12 equal items. **Consistency:** ordering is arbitrary (Inventory before Sales). **Scale:** adding CRM/HR/Manufacturing makes an unusable 15+ flat list. |
| 2 | **Stale/incorrect routes** — Procurement → `/operations/procurement` (legacy), Dashboard → `/` | **Why:** frozen Procurement lives at `/procurement/*`; the sidebar points at the deprecated tree. **UX:** clicking Procurement lands on the old/mock module, not the frozen one. **Consistency:** nav truth diverges from the app. **Scale:** every stale link is a latent broken path. |
| 3 | **No collapse / rail mode / tooltips** — sidebar is fixed `w-64` always | **Why:** no way to reclaim horizontal space for wide data tables. **UX:** power users on laptops lose 256px permanently. **Consistency:** every premium ERP offers collapse. **Scale:** wide financial tables need the room. |
| 4 | **No mobile/tablet navigation** — fixed `w-64`, `main` `p-6` fixed | **Why:** on a 375px screen the sidebar consumes ~68% width; no hamburger/drawer. **UX:** app is effectively unusable on mobile/tablet. **Consistency:** violates the responsive mandate. **Scale:** field users (UCO collections, logistics) are mobile. |
| 5 | **No breadcrumbs** anywhere | **Why:** deep routes (`/procurement/suppliers/[id]/360`) show no trail. **UX:** users can't tell where they are or step back up. **Consistency:** each page invents its own "back" link. **Scale:** deeper module trees get more lost. |
| 6 | **No global search / command palette (⌘K)** | **Why:** the only navigation is clicking the sidebar. **UX:** no fast cross-module jump, no keyboard-first flow (the directive's core ask). **Consistency:** — . **Scale:** as modules grow, click-nav gets slower; ⌘K stays O(1). |
| 7 | **Module sub-navs are re-implemented per page** (6 inline `NAV` arrays: procurement/inventory dashboards, etc.) | **Why:** each module hardcodes its own tab strip. **UX:** subtly different placements/behaviours per module. **Consistency:** no single sub-nav component. **Scale:** N modules × M pages of duplicated nav. |
| 8 | **Two competing layout systems** — `WorkspaceLayout`/`WorkspaceHeader`/`page-layout`/`drawer-layout` (old) vs `EnterprisePage`/`EnterprisePageHeader` (new) | **Why:** old inventory/finance pages use `WorkspaceLayout`; new pages use `EnterprisePage`. **UX:** page chrome (padding, header, title size) differs by page age. **Consistency:** the single biggest cohesion leak. **Scale:** every new page must "choose" a system. |
| 9 | **Non-functional notifications** — static red dot on a `Bell` with no `aria-label`, no menu | **Why:** signals unread state that doesn't exist. **UX:** false affordance; nothing happens on click. **Consistency:** — . **Scale:** real notifications have nowhere to live. |
| 10 | **User menu is minimal** — avatar → Sign out only; no profile/settings/help/shortcuts | **Why:** account/help/settings have no home. **UX:** users can't find preferences or help. **Scale:** settings surface will grow. |
| 11 | **Business switcher placement** — top-left of topbar, competing with (absent) breadcrumbs | **Why:** business context is the highest-level scope but sits inline with page chrome. **UX:** ambiguous whether it scopes the page or the app. **Consistency:** modern pattern puts workspace/business switch in the sidebar header. |
| 12 | **Accessibility gaps** — nav lacks `<nav aria-label>`/`aria-current`; active state is color-only; no skip-link; `Bell` unlabeled; no focus management for (absent) overlays | **Why:** fails WCAG 2.2 AA basics. **UX:** keyboard/SR users can't perceive current page or skip nav. **Consistency:** a11y must be uniform. **Scale:** retrofitting a11y later is costly. |
| 13 | **Layout data-fetch is heavy & duplicated** — layout queries memberships, then re-queries membership+role+permissions in a catch fallback | **Why:** two DB round-trips for permissions on the fallback path. **UX:** slower first paint. **Perf/Scale:** every navigation re-runs a force-dynamic layout. |
| 14 | **No workspace/section identity** — the shell doesn't show which "area" (Operations/Finance/Admin) you're in | **Why:** with grouped nav absent, there's no contextual heading. **UX:** orientation cost on every navigation. |

**Strengths to preserve:** clean auth guard + business-context resolution; `BrandLogo` single source; `next-themes` light/dark/system already wired; `BusinessSwitcher`/`UserMenu`/`ThemeToggle` are functional client widgets; `PoweredByAeterex` watermark; token-driven active state already uses `primary`.

---

## STEP 2 — New shell architecture

### Structure (RSC-first)
```
(dashboard)/layout.tsx  [Server]  auth + businesses + permissions + nav model
 ├─ <AppSidebar>        [Client]  collapsible; hydrated with nav model + permissions + business
 ├─ <AppTopbar>         [Server shell]  renders client islands only where needed
 │    ├─ <SidebarTrigger/Breadcrumbs>  [Client trigger + Server breadcrumbs]
 │    ├─ <GlobalSearch> + <CommandPalette ⌘K>  [Client]
 │    ├─ <QuickActions> [Client]  · <Notifications> [Client] · <ThemeToggle> [Client]
 │    └─ <UserMenu> [Client]
 ├─ <main>              [Server]  scroll container, responsive gutters
 └─ <PoweredByAeterex>
```
**Client boundary rule:** only interactive islands are client (`sidebar`, `command-palette`, `theme`,
`notifications`, `user-menu`, `business-switcher`, `search`). Breadcrumbs, page content, and the nav
model are server-computed and passed as props → minimal JS, no unnecessary rerenders.

### Sidebar (`EnterpriseSidebar`)
- **Header:** `BrandLogo` (full when expanded, `mark` when collapsed) + **BusinessSwitcher** moved here (workspace pattern) with the current business name + role.
- **Grouped navigation** (see hierarchy below): collapsible groups with a quiet group label; each item = `icon + label (+ optional badge)`; permission-gated.
- **Active indicator:** `bg-primary-subtle text-primary` + a 2px left accent bar + `aria-current="page"` (not color-only).
- **Favorites & Recent:** two small pinned sections at the top ("Pinned", "Recent") — client-persisted (localStorage), star toggle on any item; Recent tracks last-visited routes.
- **Nav search:** a compact filter input that fuzzy-filters the nav (feeds the same index as ⌘K).
- **Collapse:** toggle → **rail mode** (icons only, ~`w-14`) with **floating tooltips** on hover/focus showing the label; state persisted. Keyboard: `[` toggles.
- **Scroll:** nav scrolls; header + collapse control are sticky.

### Topbar (`EnterpriseTopbar`)
Left: sidebar trigger (mobile) · **breadcrumbs** (`Home / Section / Page / …` from route). Center/right:
**Global Search** (opens ⌘K) · **Quick Actions** (＋ New: context-aware create menu) · **Notifications**
(popover list; empty state honest) · **Theme** switch · **Help** (docs/shortcuts) · **User menu**
(profile, settings, keyboard shortcuts, sign out). Height `h-14`, `border-b`, `bg-card`.

### Command Palette (`EnterpriseCommandPalette`, ⌘K / Ctrl+K)
One index: **navigate** (all permitted routes + sub-pages), **actions** (New Invoice/PO/Payment…),
**switch business**, **toggle theme**, **go to settings/help**. Fuzzy search, grouped results, keyboard
loop, recent commands. Built on a `cmdk`-style primitive (add dependency) styled to tokens; the sidebar
nav-search and topbar global-search both open it.

### Navigation hierarchy (permission-gated, corrected routes)
| Group | Item → route | Icon | Perm |
|---|---|---|---|
| **Overview** | Dashboard → `/` | `LayoutDashboard` | — |
| **Operations** | Sales → `/sales` | `ShoppingCart` | `sales.read` |
| | Procurement → `/procurement` *(fixed from /operations/procurement)* | `PackageCheck` | `procurement.read` |
| | Inventory → `/inventory` | `Boxes` | `inventory.read` |
| | Logistics → `/operations/logistics` | `Truck` | `logistics.read` |
| **Finance** | Finance → `/finance` | `Banknote` | `finance.read` |
| | Reports → `/reports` | `BarChart3` | `reporting.read` |
| **Business Units** | Salam Cola → `/salam-cola` | `GlassWater` | `salam.read` |
| | UCO Collections → `/uco` | `Droplet` | `uco.read` |
| | Casa de Lumas → `/lumas` | `Box` | `lumas.read` |
| **Administration** | Businesses → `/business` | `Building2` | — |
| | Governance → `/governance` | `Shield` | `governance.read` |
Nav model lives in one typed config (`lib/navigation.ts`) consumed by sidebar + palette + breadcrumbs —
the single source of nav truth. Each item: `{ label, href, icon, permission?, badge? }`; groups:
`{ label, items }`. **CRM/HR/Manufacturing** slot in as future groups without shell changes.

### Page Header (one component, kills the dual-layout leak)
Standardize on **`EnterprisePageHeader`** everywhere: `title` + `description` + `breadcrumbs` (or inherit
from topbar) + `primaryAction` + `secondaryActions` + `filters` slot + `export`/`print` + permission
gating on actions. Retire `WorkspaceLayout`/`WorkspaceHeader`/`page-layout`/`drawer-layout` (Phase 3
migration; no page loses function). Module sub-navs become one `EnterpriseSubNav` (tabs) fed by config.

### Responsive (adapt, never just hide)
| Breakpoint | Shell behaviour |
|---|---|
| **Mobile** < 768 | Sidebar → off-canvas **drawer** (Sheet) via topbar hamburger; topbar condenses (logo + search icon + user); breadcrumbs collapse to current page; gutters `px-4`. |
| **Tablet** 768–1024 | Sidebar defaults to **rail** (icons + tooltips); topbar full; content `px-6`. |
| **Laptop** 1024–1440 | Expanded sidebar (`w-64`) + full topbar. |
| **Desktop** 1440–1920 | Same; content max-width only for reading/forms, tables full-width. |
| **Ultra-wide** > 1920 | Content constrained to a comfortable max (e.g. `max-w-[1600px]` centered) so lines/tables don't stretch; sidebar fixed. |

### Theme, Motion, A11y, Performance
- **Theme:** already `next-themes`; both light + dark authored via tokens; dark = soft blue-black. Theme toggle stays; palette applies automatically.
- **Motion (per MOTION_GUIDELINES):** sidebar collapse ≤200ms (width/opacity), drawer slide ≤240ms, tooltip/menu fade ≤160ms, palette fade+scale; reduced-motion honored.
- **A11y (per ACCESSIBILITY):** `<nav aria-label>`, `aria-current="page"`, skip-to-content link, focus-visible everywhere, palette/drawer focus-trap+restore+Esc, all icon-buttons labeled, logical tab order, ⌘K discoverable in Help.
- **Performance:** server layout computes nav model + permissions **once** (single query; remove the double-fetch fallback); client islands are small and memo-stable; nav model passed as props (no client fetch); persisted UI prefs via localStorage (no server round-trip).

---

## STEP 3 — Component mapping (reuse first, one implementation each)

| Old / current | New (target) | Action |
|---|---|---|
| `layout/sidebar.tsx` (flat) | `EnterpriseSidebar` (grouped, collapsible, favorites/recent, nav-search) | **Rebuild** on `lib/navigation.ts` |
| `layout/topbar.tsx` (server, sparse) | `EnterpriseTopbar` (breadcrumbs, search, palette, quick-actions, notifications, theme, help, user) | **Rebuild** (compose existing islands) |
| — | `EnterpriseBreadcrumb` | **Build** (from route + nav model) |
| — | `EnterpriseCommandPalette` (⌘K) | **Build** (add `cmdk`-style primitive) |
| — | `EnterpriseGlobalSearch` | **Build** (opens palette) |
| — | `EnterpriseQuickActions` (＋ New) | **Build** (context create menu) |
| `Bell` static dot | `EnterpriseNotifications` (popover + honest empty state) | **Build** (UI only; data source later) |
| `layout/theme-toggle.tsx` | `EnterpriseThemeSwitcher` | **Keep** (restyle to tokens; add labels) |
| `layout/business-switcher.tsx` | `EnterpriseBusinessSwitcher` (moved into sidebar header) | **Keep** (relocate + restyle) |
| `layout/user-menu.tsx` | `EnterpriseUserMenu` (profile/settings/shortcuts/help/sign-out) | **Extend** |
| inline per-page `NAV[]` (×6) | `EnterpriseSubNav` (tabs from config) | **Build**; migrate pages in Phase 3/4 |
| `WorkspaceLayout` / `WorkspaceHeader` / `page-layout` / `drawer-layout` | `EnterprisePage` / `EnterprisePageHeader` / `EnterpriseDrawer` | **Deprecate & migrate** (Phase 3) |
| `(dashboard)/layout.tsx` | same file, slimmer (single perms query, new shell) | **Refactor** (no auth/logic change) |
| `lib` (no nav config) | `lib/navigation.ts` (typed nav model) | **Build** (single source of nav truth) |

**Reuse:** `BrandLogo`, `BusinessSwitcher`, `UserMenu`, `ThemeToggle`, `PoweredByAeterex`, dropdown/sheet/
tooltip/avatar primitives, `sonner` toasts, permission helpers, `EnterprisePageHeader`. **No backend,
service, API, DB, permission, or workflow changes** — the shell consumes the same session/permissions
already provided by `server-auth`.

---

## Step 4 (implement) & Step 5 (verify) — deferred to implementation
Implementation order: `lib/navigation.ts` → `EnterpriseSidebar` → `EnterpriseTopbar` + breadcrumbs →
command palette + search + quick actions → notifications/user-menu polish → responsive drawer →
`(dashboard)/layout.tsx` refactor. Verify matrix: light · dark · mobile · tablet · desktop · ultra-wide
· keyboard-only · a11y (axe + SR smoke) · `tsc` · `build` · lint · no backend diff · frozen-module
routes still resolve. Documented on completion.

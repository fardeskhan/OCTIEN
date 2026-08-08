# OCTIEN Navigation Architecture

The **contract** for the shell. One typed model — `apps/frontend/src/lib/navigation.ts` — is the
single authoritative source. The sidebar, breadcrumbs, command palette, navigation search, favorites,
recent, permission checks, and active-route detection are **all generated from it**. Nothing about
navigation is hardcoded anywhere else. Future modules (CRM, HR, Manufacturing…) plug in here — they
never invent their own nav pattern.

## Model
```
NavGroup { label, items: NavItem[] }
NavItem  { label, href?, icon, permission?, status?("live"|"soon"), badge?, keywords?, match? }
```
- **Groups** provide the enterprise IA sections. **Items** are leaves.
- **`status`** — `live` links to a shipped route; `soon` models the full IA (scales to 100+ pages) but
  renders **disabled + "Soon" badge** and never produces a broken link.
- **`permission`** — `resource.action`; undefined = always visible; Owner/super-admin bypasses via `"*"`.
- **`match`** — `prefix` (default) or `exact` (Dashboard `/`).
- **`keywords`** — extra terms for palette/search indexing.

## Hierarchy (as implemented)
**Overview** (Dashboard, Reports, Analytics·soon) · **Operations** (Sales, Procurement, Inventory,
Manufacturing·soon, Logistics) · **Finance** (Accounting, Statements, Receivables, Payables, Banking,
Assets, Period Close, Budgets·soon, Taxes·soon) · **Customer** (CRM·soon, Support·soon, Marketing·soon)
· **People** (HR·soon, Payroll·soon, Attendance·soon) · **Business Units** (Salam Cola, UCO Collections,
Casa de Lumas) · **Administration** (Businesses, Governance, Users & Roles·soon, Permissions·soon,
Settings·soon).

> **Route correction baked in:** Procurement → `/procurement` (was the legacy `/operations/procurement`).
> Live routes match shipped pages; everything not yet built is `soon`.

## Icons & badges
- Every item has a **Lucide** icon (see ICONOGRAPHY). One concept → one icon, defined only here.
- **Badges:** optional string/number. Reserved uses: `"Soon"` (auto for `status:"soon"`), live counts
  (e.g. pending approvals — wired later from real services), `"Beta"`. Rendered as a small pill; never color-only meaning.

## Permission mapping
`canSee(item, permissions)` gates each item. `getVisibleNavigation(permissions, {includeSoon})` returns
permission-filtered groups with empty groups removed. The server layout passes the user's `permissions`
(already resolved by `server-auth`) to the client sidebar, which filters via this helper — **no new
permission logic, no backend change.** Owner/super-admin (`"*"`) sees all permitted items.

## Active-route detection
`isActive(item, pathname)` — exact for `/`, otherwise `pathname === href || startsWith(href + "/")`.
The sidebar marks the active item with `bg-primary-subtle text-primary`, a 2px left accent bar, and
`aria-current="page"` (never color-only).

## Breadcrumb generation
`getBreadcrumbs(pathname)` derives `Home > <Group> > <Nav item> > <deeper segments…>` from the model +
URL: it finds the deepest live nav match (`findNavMatch`), emits the group (non-link) and item (link),
then appends prettified dynamic segments (`purchase-orders` → "Purchase Orders"; cuid/hash ids →
`abcd1234…`). The last crumb is the current page (unlinked). Unknown routes fall back to prettified
segments. Breadcrumbs render in the topbar, client-side from `usePathname()`.

## Favorites (localStorage first, sync later)
- Users star any live item; favorites pin to a **"Favorites"** section at the top of the sidebar
  (above the groups) and appear as a palette group.
- Storage key `octien:favorites` (array of hrefs). Client-only initially; a future user-prefs service
  can sync — the read/write is isolated behind a `useFavorites()` hook so the source can swap without UI change.
- Star toggle appears on hover/focus of any nav item and in the palette.

## Recent
- Tracks the last ~8 distinct visited live routes → a **"Recent"** section (below Favorites) and a
  palette group. Key `octien:recent`. Updated by a small client effect on route change; deduped, capped,
  most-recent-first. Never includes `soon` or unknown routes.

## Navigation search (in-sidebar)
A compact `Search navigation…` input at the top of the sidebar fuzzy-filters the **nav model only**
(label + keywords via `flattenNavigation`). Instant, local, keyboard-navigable; `↑/↓` move, `Enter`
opens, `Esc` clears. Distinct from global search — this is a fast filter over navigation.

## Command Palette (⌘K / Ctrl+K) — Linear + Raycast, not just VS Code
Opens from the topbar, the sidebar search, or the shortcut. One index, grouped results, fuzzy match,
keyboard loop, recent commands. Scope (progressive — UI + indexing built now, data sources wired as
modules land):
1. **Navigate** — every live, permitted route (`flattenNavigation`) + Favorites + Recent.
2. **Jump to entities** — customers, invoices, suppliers, purchase orders, products, journal entries
   (searches real read services per module; permission-aware).
3. **Create** — contextual "New …" actions (see Quick Actions), permission-aware.
4. **Commands** — switch business, toggle theme, go to Settings/Help, **calculator** (evaluate `= 12*8`),
   **documentation search** (indexes `docs/` + in-app help).
Implemented on the installed **`cmdk`** primitive wrapped in the project's base-ui Dialog, styled to
tokens. Mounts via the existing `CommandPaletteProvider` slot in `shared/providers/AppProviders.tsx`.

## Quick Actions (contextual "＋ New")
A topbar `＋ New` menu of create actions — `Customer, Sales Order, Invoice, Purchase Order, Product,
Journal Entry, Employee(soon)…` — each **permission-aware** (hidden without the corresponding
`*.write`) and route/context-aware (surfaces the most relevant creates for the current module first).
Sourced from a small `quickActions` config alongside the nav model; also surfaced in the palette's
Create group. No new mutations — links to existing create routes/forms.

## Notifications (real architecture, mock data initially)
Not a fake dot. A `Notification` shape — `{ id, icon, title, description, timestamp, unread, href,
severity("info"|"success"|"warning"|"danger") }` — grouped **Today / Yesterday / Earlier**, with
unread count on the bell, mark-as-read, and empty state. Initially fed by mock UI state behind a
`useNotifications()` hook; the hook is the seam a future notification service drops into with zero UI change.

## Business (workspace) switcher — placement
Belongs to **workspace identity**, so it lives in the **sidebar header** (below the OCTIEN logo), not
the topbar. Shows current business + role; switching calls the existing `switchBusiness` action. The
topbar shows breadcrumbs (page context), not business context.

## Responsive spec (adapt, never hide)
| Viewport | Sidebar | Content |
|---|---|---|
| **Mobile** < 768 | Off-canvas **drawer** (Sheet) via topbar hamburger | `px-4`; breadcrumbs collapse to current page |
| **Tablet** 768–1024 | **72px icon rail** + floating tooltips | `px-6` |
| **Desktop** ≥ 1024 | **280px** expanded (user-collapsible to rail) | `px-6` |
| **Ultra-wide** > 1920 | 280px fixed | content centered, **`max-width: 1800px`** (dashboards/tables stay readable) |
Collapse state + density + favorites + recent persist in localStorage.

## Shell consumption map (all from this one model)
`EnterpriseSidebar` (groups, favorites, recent, nav-search, active) · `EnterpriseBreadcrumb`
(`getBreadcrumbs`) · `EnterpriseCommandPalette` (`flattenNavigation` + entity/command sources) ·
`EnterpriseQuickActions` (`quickActions`) · permission filter (`getVisibleNavigation`) · active
detection (`isActive`). Change navigation once, here — every surface updates.

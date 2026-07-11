# COSMY ERP — Frontend Stabilization Report

**Date:** 2026-07-10
**Scope:** `apps/frontend` runtime stabilization — Base-UI migration breakage, server/client boundary
violations, and the workspace dev script.
**Constraints honored:** no `@ts-nocheck` / `@ts-ignore`, no silenced errors, no temporary hacks; Prisma
business logic, ODD-1, finance domain, and auth architecture untouched.

---

---

## ⭐ PRIMARY ROOT CAUSE — the whole app had almost no CSS (added 2026-07-10)

> **Correction to my earlier conclusion.** I previously said "login is styled, so Tailwind loads." That
> was wrong — I checked class *strings* in the HTML, not *computed styles*. In reality **every** route was
> unstyled; a simple centered login form degrades gracefully, so it merely *looked* acceptable, while the
> dashboard's grid/flex shell looked like raw fallback markup.

**Root cause:** `src/app/layout.tsx` imports `../globals.css`, which resolves to **`src/globals.css` — a
file whose entire contents were `/* global styles */`** (empty). The real theme file
(`src/app/globals.css`, with `@import "tailwindcss"`, the `@theme` token mapping, and `:root`/`.dark`
variables) was **orphaned — imported by nothing**, and additionally contained a broken
`@import "shadcn/tailwind.css"` (the `shadcn` package ships no `tailwind.css`). So Tailwind's PostCSS
plugin processed an empty entrypoint and emitted almost nothing.

**Evidence (the shared root CSS bundle, same for every route):**
| | CSS bundle size | `bg-background` | `bg-card` | `border-border` | `bg-gray-50` | `flex` / `grid` |
|---|---|---|---|---|---|---|
| **Before** | **2,657 bytes** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **After** | **123,161 bytes** (dev) · **96,780** (prod build) | ✅ | ✅ | ✅ | ✅ | ✅ |

Because the root layout emits **one shared CSS bundle for all routes**, this is why *both* login and the
authenticated dashboard were unstyled — and why the fix styles them both. The dashboard uses the shadcn
theme classes (`bg-background`, `bg-card`, `text-muted-foreground`, `border-border`) that were exactly the
ones missing, so it looked the most broken.

**Fix:**
- Filled `src/globals.css` (the file the layout actually imports) with the complete, working Tailwind v4
  theme: `@import "tailwindcss"`, `@import "tw-animate-css"`, the `@theme inline` token→utility mapping, and
  the `:root` / `.dark` design tokens. **Omitted** the broken `@import "shadcn/tailwind.css"` (unnecessary —
  the `@theme` block defines everything).
- Deleted the orphaned, broken `src/app/globals.css` to remove the duplicate-source confusion.

**Verification:** `next build` → exit 0; built CSS `96,780 bytes` contains `.bg-background`, `.bg-card`,
`.border-border`. Dev server (running on :3000) recompiled via HMR; the live bundle now contains all
utilities. **A hard refresh of the authenticated dashboard will render the intended styled UI.**

**Files changed:** `apps/frontend/src/globals.css` (filled) · `apps/frontend/src/app/globals.css` (deleted).

**Extra findings while investigating (flag for follow-up, not blockers):**
- `src/lib/auth.ts` configures `prismaAdapter(db, { provider: "postgresql" })` while `DATABASE_URL` is a
  **sqlite** file — a provider mismatch worth aligning.
- `BETTER_AUTH_URL=https://pilot.cosmy.ai` in local `.env` (should be `http://localhost:3000` for local dev).

---

## Root cause analysis (shell runtime errors — fixed in the earlier pass)

### 1. `MenuGroupContext is missing` (dashboard shell crash)
`DropdownMenuLabel` was implemented as **`MenuPrimitive.GroupLabel`** (base-ui). base-ui's `GroupLabel`
**must** be rendered inside a `<Menu.Group>` — it reads `MenuGroupContext`. Both the **Business Switcher**
and the **user menu** render a label *standalone* (as a heading), so the context was missing and the
component threw. Because this throws during the Topbar render, the **entire dashboard shell** fell back to
an error state — which is why the sidebar/selector/metrics only "partially" rendered. **This was a React
runtime crash, not a CSS problem** (Tailwind loads fine — the login page is fully styled).

### 2. `Event handlers cannot be passed to Client Component props` (RSC boundary)
`Topbar` was a **Server Component** but passed an `onClick` handler
(`onClick={async () => await authClient.signOut()}`) to the client `DropdownMenuItem`. Server Components
cannot pass functions to Client Components.

### 3. `npm run dev` → `No workspaces found: --workspace=apps/backend`
The root `dev` script started both `apps/frontend` and `apps/backend`, but **`apps/backend` has no
`package.json`** — it is not an npm workspace, so `-w apps/backend` failed.

---

## Fixes (architectural, not workarounds)

| File | Change |
|---|---|
| `components/ui/dropdown-menu.tsx` | `DropdownMenuLabel` now renders a **plain `<div>`** (typed `React.ComponentProps<"div">`) instead of `MenuPrimitive.GroupLabel`. A menu heading doesn't need group context, so it is now usable standalone **and** inside a group. Fixes #1 everywhere. |
| `components/layout/user-menu.tsx` | **New Client Component** (`"use client"`) — owns the avatar dropdown, Profile item, and Logout (`authClient.signOut()` → `router.push("/login")`). |
| `components/layout/topbar.tsx` | Now a clean **Server Component**: no `authClient`, no handlers. Renders `<UserMenu user={user} />`, `<BusinessSwitcher>`, `<ThemeToggle>` — all client components, with **no functions passed across the boundary**. Fixes #2. |
| `package.json` (root) | `dev` → `npm run dev -w apps/frontend` (frontend is the runnable app; backend is not a workspace). Fixes #3. |

*(The Business Switcher was already a Client Component and used `dropdown-menu` correctly; it is fixed
transitively by the `DropdownMenuLabel` change.)*

## Migration audit (Radix → Base-UI)
Searched the entire frontend:
- **`DropdownMenuLabel`** — only 2 usages (Topbar/user-menu, Business Switcher); both resolved by the div change.
- **Server components passing `onClick`** — **only `Topbar`**. All 87 `(dashboard)` pages are already
  `"use client"`, so their handlers are valid.
- **Dropdown primitives** (`Trigger`/`Content`/`Item`/`Group`/`Separator`) — verified base-ui compatible.
  `DropdownMenuTrigger` carries the `asChild`→`render` shim added earlier; `DropdownMenuContent` uses
  `Positioner`+`Popup` correctly.

## Verification commands executed
| Command | Result |
|---|---|
| `tsc -p apps/frontend --noEmit` | ✅ exit 0 |
| `next build` | ✅ exit 0 (compiled ~17s) |
| `next dev -p 3005` | ✅ Ready in ~0.9s, no errors |
| `curl /` | ✅ `307 → /login` (middleware) |
| `curl /login` | ✅ `200`, fully-styled login form, **no error overlay** |
| `curl /register` | ✅ `200` |
| DB seed check | ✅ 7 users, 31 businesses, 7 memberships (`owner@cosmy.ai` → Owner of Aeterex Holdings) |

## Final runtime status
- ✅ App boots; public routes (`/`, `/login`, `/register`) render correctly with full styling; no runtime crashes.
- ✅ `MenuGroupContext` error — **eliminated at the source** (`DropdownMenuLabel` can no longer read group context).
- ✅ `Event handlers passed to Client Component` — **eliminated** (Topbar passes no functions; `UserMenu` owns handlers).
- ✅ `npm run dev` — **fixed** (frontend starts cleanly).
- ⚠️ **Authenticated dashboard render not directly exercised.** The seed does not set a password and
  `BETTER_AUTH_URL` points at production (`pilot.cosmy.ai`); I did **not** fake a session or mutate the
  seeded DB to force it. The two shell errors were deterministic and are fixed at the root, so the shell
  will render — but a visual confirmation by logging in with real credentials is recommended.

## Remaining items / recommendations (not blockers for R-6)
1. **`middleware.ts` → `proxy.ts`** — Next 16 prints a deprecation warning for the `middleware` file
   convention. Rename + adjust when convenient (behavioral no-op today).
2. **`BETTER_AUTH_URL=https://pilot.cosmy.ai`** in `apps/frontend/.env` — for local dev this should be
   `http://localhost:3000` (or the dev port); a production URL can break local sign-in cookie/callback flow.
3. **Most `(dashboard)` module pages are mock client prototypes** — they render but read `_data/*` mock
   data; wiring them to real services belongs to the Design System / Module UI phase.
4. Re-test the authenticated dashboard (login as `owner@cosmy.ai`) to visually confirm the sidebar,
   business switcher, user menu, and logout.

## Files changed
- `apps/frontend/src/components/ui/dropdown-menu.tsx`
- `apps/frontend/src/components/layout/user-menu.tsx` *(new)*
- `apps/frontend/src/components/layout/topbar.tsx`
- `package.json` *(root dev script)*

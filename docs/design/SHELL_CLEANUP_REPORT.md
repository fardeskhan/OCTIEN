# OCTIEN Shell — Legacy Cleanup Report (CAP-SHELL V1.0, Phase 6)

**Scope:** remove dead shell code so the codebase has exactly **one canonical shell implementation**.
Cleanup only — no features, no UI redesign, no backend. **Nothing was deleted without first proving
zero references** (static imports, dynamic imports, and exported-symbol name search), followed by
`tsc` + `eslint` + production build after each batch.

---

## Deleted — files (3)

Each confirmed to have **zero references of any kind** across `src/` before deletion:

| File | Was | Verification |
|---|---|---|
| `components/layout/sidebar.tsx` | legacy pre-redesign sidebar | 0 imports, 0 dynamic, 0 symbol refs |
| `components/layout/page-layout.tsx` | legacy page wrapper | 0 imports, 0 dynamic, `PageLayout` symbol unused |
| `components/layout/business-switcher.tsx` | legacy business switcher (superseded by `EnterpriseWorkspaceSwitcher`) | 0 imports, `BusinessSwitcher` symbol unused |

*(Deleted in earlier phases, already confirmed gone: `components/layout/theme-toggle.tsx`,
`topbar.tsx`, `user-menu.tsx` — the legacy theme toggle, topbar, and user menu.)*

## Deleted — exports (1)

| Export | File | Reason |
|---|---|---|
| `export { ArrowRight }` (+ its unused `lucide-react` import) | `EnterpriseSearchProvider.tsx` | dead re-export; `EnterpriseSearchResult` imports `ArrowRight` directly from `lucide-react`, nothing imported it from the provider |

## Deleted — CSS

None required. `globals.css` audit found **no dead keyframes, utilities, or duplicate rules**:

- **Keyframes** (3): `octien-slide-in-left`, `octien-slide-in-right`, `octien-fade-in` — all
  referenced by the animation utilities below.
- **Animation utilities** (3): `.animate-drawer-left` (mobile drawer), `.animate-drawer-right`
  (AI overlay), `.animate-overlay-fade` (AI + drawer backdrops, AI docked fade) — all used.
- **Scrollbar:** one `.scrollbar-enterprise` (the `.scrollbar-ghost` and dead `.custom-scrollbar`
  were removed in the scroll-system phase; 0 references remain).
- **`.no-print`** — used by `PoweredByAeterex`.

## Deleted — hooks / utilities / providers

None. All shell hooks are live: `useSidebar`, `useFavorites`, `useRecent`/`useTrackRecent`,
`useNavigationSearch`, `useFocusTrap`, `useSearchController`, `useRecentSearches`. All providers are
live: `EnterpriseSearchProvider`, `EnterpriseNotificationProvider`, `EnterpriseAIProvider`,
`ShellChromeProvider`.

## Packages removed

None. The deleted legacy files imported only React + `lucide-react` + `cn`, all still used heavily
elsewhere. No dependency became unused as a result of the shell rewrite. (Dependency removal was
**not** attempted speculatively, per the "don't remove runtime deps accidentally" rule.)

---

## Barrels

The shell barrels (`shell/`, `search/`, `notifications/`, `ai/` `index.ts`) export the **public shell
API**. The newer internal-composition pieces (`ShellChromeProvider`, `EnterpriseMobileSidebar`,
`EnterpriseMobileNavTrigger`, `useFocusTrap`) are intentionally **not** barrel-exported — they are
consumed via direct relative imports inside the shell only, which is correct (they are not part of
the public surface). No circular exports. No dead barrel exports found.

---

## Retained intentionally (with justification)

These are **not** shell code and are **actively used**; deleting them would break ~100 module pages.
They belong to the *module-page* layer and will be replaced **per-module during the module redesigns**
(after the shell is frozen), not in this shell-cleanup phase:

| File | Used by | Justification |
|---|---|---|
| `components/layout/workspace-layout.tsx` (`WorkspaceLayout`, `WorkspaceHeader`, `WorkspaceKPIs`, `WorkspaceFilters`) | ~100 module pages + `enterprise/layout` + `enterprise/data` barrels | current page-content layout for every module page; migration is a module-redesign task, out of scope here |
| `components/layout/drawer-layout.tsx` (`EntityDrawer`) | ~10 module pages + governance/salam-cola drawers | current entity-drawer used across modules |

---

## Architecture — one implementation each (verified)

Exactly one active implementation of every shell capability, all under
`components/enterprise/{shell,search,notifications,ai}`:

| Capability | Canonical implementation |
|---|---|
| Sidebar | `EnterpriseSidebar` |
| Header | `EnterpriseTopbar` |
| Breadcrumbs | `EnterpriseBreadcrumb` |
| Navigation (definition) | `lib/navigation.ts` (single source; `EnterpriseSidebarNavigation` is a renderer, not a second definition) |
| Search platform | `EnterpriseSearchProvider` + `lib/{fuzzy-search,search,search-index,entity-sources}.ts` (one fuzzy impl, imported by the rest) |
| Global Search | `EnterpriseGlobalSearch` |
| Command Palette | `EnterpriseCommandPalette` |
| Notifications | `EnterpriseNotificationProvider` + center |
| User Menu | `EnterpriseUserMenu` |
| Theme Switcher | `EnterpriseThemeSwitcher` (one component; header + menu reuse it) |
| AI Panel | `EnterpriseAIPanel` |
| Mobile Drawer | `EnterpriseMobileSidebar` (+ `EnterpriseMobileNavTrigger`) |
| Scrollbar | `.scrollbar-enterprise` / `EnterpriseScrollArea` |
| Shell Provider | `EnterpriseShell` composing `ShellChromeProvider` + Search/Notification/AI providers |

No parallel or duplicate implementations remain in the shell.

---

## Note — pre-existing lint debt (out of scope)

`eslint src` reports ~200 problems (`no-explicit-any`, unused vars) in **module `app/` pages** and a
few **module-support UI components** (`chart-wrappers`, `data-table`, `route-map-panel`). This debt
**pre-dates** the shell work, is unrelated to these deletions, and does **not** block the production
build. `src/components/enterprise` (the shell) lints **0 errors / 0 warnings**. The `app/` debt is
appropriately addressed during the module redesigns, not in shell cleanup.

---

## Verification

Run after the deletion batches:

- **TypeScript:** `tsc --noEmit` → **0 errors**.
- **ESLint (`src/components/enterprise`):** **0 errors / 0 warnings**.
- **Production build:** **compiled successfully** (EXIT 0), no "Module not found".
- **Browser smoke:** shell loads and every surface opens (see verification log).

**Status:** the shell is now a single canonical implementation with no dead shell code. Ready for
**Phase 7 — Documentation**.

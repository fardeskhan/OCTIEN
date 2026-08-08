# CAP-SHELL V1.0 — Release Notes

**Status:** ✅ FROZEN · **Date:** 2026-08-03 · **Scope:** the OCTIEN application shell (frontend
chrome). Backend untouched throughout.

CAP-SHELL V1.0 is the permanent design system and application frame for OCTIEN. Every screen built
from here on renders inside it and reuses its components, tokens, and interaction patterns.

---

## Completed features

- **Global shell** — module-agnostic sidebar (280↔72 rail) + header + breadcrumbs + scrollable main,
  all generated from a single typed navigation model (`lib/navigation.ts`).
- **Enterprise Search Platform** — one search engine; **Command Palette** (⌘K, actions + calculator)
  and **Global Search** (/, entities) are two surfaces over it. Fuzzy, permission-gated, DB-ready.
- **Notification Center** — an enterprise notification *platform* (provider + typed model +
  severity/type system + day-grouping + filters + optimistic mutations), not a dropdown.
- **Quick Actions** — config-driven, permission-aware ＋New menu.
- **User Menu** — a full account center (identity, workspace + role, grouped sections, sign out).
- **Theme System** — one segmented `System / Light / Dark` switcher reused in header + menu; instant,
  flicker-free.
- **AI Assistant Panel** — permanent, provider-agnostic AI workspace (docked/resizable desktop,
  overlay tablet, full sheet mobile; message roles, composer, context, suggestions, toolbar).
- **Mobile & Tablet shell** — off-canvas drawer, responsive header, overlay/sheet panels.
- **Unified scroll system** — one `.scrollbar-enterprise` everywhere.
- **Accessibility** — WCAG 2.2 AA (focus management, contrast, ARIA, reduced motion, touch targets).

## Architecture decisions

- **Provider-owned state, pure-render components** — each platform (search, notifications, AI, chrome)
  owns state in a memoized provider; UI never holds platform state.
- **Single sources of truth** — one navigation model, one search engine, one theme component, one
  scrollbar; favorites/recent share storage with the sidebar.
- **Mock → service seams** — notifications, entity search, and AI all swap to live data by changing
  one file, with zero UI change.
- **Tokens only** — all color/radius/elevation/typography/motion from `globals.css`; 0 hardcoded
  colors, 0 arbitrary font sizes.
- **Responsive by construction** — sidebar via CSS breakpoints, AI panel via a media-query hook +
  inline width (avoids fragile arbitrary CSS); server-rendered chrome (no CLS).

## Breaking changes

- The legacy `components/layout` shell (sidebar, topbar, theme toggle, user menu, page-layout,
  business-switcher) is **removed**. New screens must use the `EnterpriseShell` chrome — the
  `(dashboard)/layout.tsx` already provides it; pages render as `children` only.
- Theme is now the segmented `EnterpriseThemeSwitcher` (the old icon-dropdown `ThemeToggle` is gone).

## Deleted legacy files

`components/layout/`: `sidebar.tsx`, `topbar.tsx`, `theme-toggle.tsx`, `user-menu.tsx`,
`page-layout.tsx`, `business-switcher.tsx` — all confirmed zero-reference before deletion. Dead
`ArrowRight` re-export removed from `EnterpriseSearchProvider`. See `SHELL_CLEANUP_REPORT.md`.

## Known limitations

- **AI panel is placeholder-only** — no LLM/MCP/workflow is connected; the "Preview" tag reflects
  this. It renders a sample conversation and real page/module context; selected-entity context is
  placeholder until wired.
- **Notification/entity/AI data are mock** — behind service seams, awaiting live sources.
- **AI composer `draft` in context** re-renders the panel subtree per keystroke — fine for the
  placeholder; move to local state when the backend + long conversations arrive.
- **Sidebar collapse animates `width`** — the one layout-property animation (contained, reduced-motion
  disabled).
- **Module-page layer** (`workspace-layout`, `drawer-layout`) is unchanged legacy, replaced
  per-module during the redesigns — not part of the frozen shell.
- **Pre-existing lint debt** (~200 `no-explicit-any`/unused) in module `app/` pages — out of scope,
  does not block the build; the shell is 0/0.

## Future roadmap

1. **CAP-PLATFORM V1** — evolve OCTIEN into a generic, multi-tenant enterprise platform (org /
   workspace / business / industry pack / module registry / IAM / RBAC / region & record-level access
   / licensing / audit / workflow), architecture-first, industry-agnostic.
2. **ERP UI/UX audit** — a code-free audit producing the module redesign roadmap.
3. **Module redesigns** (Design Review Gate each): Dashboard → Sales → Procurement → Inventory →
   Finance → CRM → HR → Manufacturing → UCO → Salam Cola → Administration — all reusing this shell.
4. Wire the service seams (notifications, entity search, AI runtime).

## Migration notes

- Build new screens as content only; the shell is provided by `(dashboard)/layout.tsx`.
- Use `EnterpriseScrollArea` (or `.scrollbar-enterprise`) for any scroll region — never custom
  scrollbar CSS.
- Add navigation entries to `lib/navigation.ts`; add search sources to the registry; publish
  notifications through the provider contract.

## Developer guidelines (the freeze contract)

1. **Reuse the shell** — its components, tokens, spacing, typography, motion, navigation, and
   interaction patterns. Do **not** introduce new visual variants.
2. **Tokens only** — no hardcoded colors, no arbitrary font sizes, use the radius/elevation scales.
3. **One implementation** — never fork a shell capability (theme, scrollbar, search, …).
4. **Accessibility is non-negotiable** — visible focus, keyboard paths, AA contrast, reduced motion.
5. **No shell UI changes** after this point except critical bug fixes. New capabilities extend via
   the documented extension points, not by re-styling the shell.

---

**CAP-SHELL V1.0 is frozen.** It is the permanent visual and interaction foundation for OCTIEN.

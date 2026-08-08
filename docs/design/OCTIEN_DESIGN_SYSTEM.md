# OCTIEN Design System

**The single source of truth for OCTIEN's frontend.** OCTIEN is an enterprise ERP used 8+ hours/day;
the design language is **minimal, premium, data-first, calm, and cohesive**. Every screen must feel
like one product. Backend, business logic, services, APIs, and workflows are **frozen** — the design
system governs *presentation only*.

> Identity: **Blue · White · Black.** Framework: **Next.js 16 + React 19 + Tailwind v4 + shadcn/ui
> (base-ui) + Lucide.** Tokens live in `apps/frontend/src/globals.css` (`@theme`). Components live in
> `apps/frontend/src/components/enterprise/*`.

## Document map (`docs/design/`)
| Doc | Scope | Status |
|---|---|---|
| `OCTIEN_DESIGN_SYSTEM.md` | This overview + principles + token index | ✅ |
| `COLOR_SYSTEM.md` | Full palette, semantics, status, charts, dark theme, contrast | ✅ |
| `TYPOGRAPHY.md` | Type scale, roles, numeric/tabular rules | ✅ |
| `SPACING_SYSTEM.md` | Spacing scale, layout rhythm, density | ✅ |
| `UI_PRINCIPLES.md` | Decision heuristics | ✅ |
| `ICONOGRAPHY.md` | Lucide usage, sizing | ✅ |
| `COMPONENT_GUIDELINES.md` | Enterprise component contracts + inventory/gaps | ✅ |
| `DATA_TABLE_GUIDELINES.md` | Table anatomy, density, interactions | ✅ |
| `DASHBOARD_GUIDELINES.md` | KPI/metric/chart layout | ✅ |
| `FORM_GUIDELINES.md` | Inputs, validation, grouping | ✅ |
| `MOTION_GUIDELINES.md` | Durations, easings, reduced-motion | ✅ |
| `ACCESSIBILITY.md` | WCAG 2.2 AA checklist | ✅ |

## First principles
1. **Every pixel has purpose.** No decoration for its own sake. Remove before adding.
2. **Data first.** Numbers use tabular figures; tables and KPIs are the hero, chrome recedes.
3. **One system.** Tokens over hardcoded values; shared `Enterprise*` components over bespoke markup.
4. **Calm.** Restrained color — blue for identity/primary action only; status color is earned, not ambient. No gradients-as-decoration, no glassmorphism, no flashy motion.
5. **Two true themes.** Dark mode is a designed enterprise theme (soft blue-black, deep blue-gray surfaces), never an inversion.
6. **Accessible by default.** WCAG 2.2 AA minimum: contrast, focus-visible, keyboard, reduced-motion, semantics.
7. **Fast.** Compact type, virtualization-ready tables, static assets out of the bundle, minimal DOM.

## Token index (consume these — never hardcode)
**Surfaces:** `background`, `foreground`, `card`, `popover`, `muted`, `accent`, `secondary`.
**Brand:** `primary`, `primary-foreground`, `primary-hover`, `primary-active`, `primary-subtle`(+`-foreground`).
**Lines:** `border`, `border-strong`, `input`, `ring`.
**Status (+`-foreground`, +`-subtle`):** `success`, `warning`, `destructive`, `info`.
**Charts:** `chart-1…6`.
**Sidebar:** `sidebar`, `sidebar-foreground`, `sidebar-primary`(+`-foreground`), `sidebar-accent`(+`-foreground`), `sidebar-border`, `sidebar-ring`.
**Radius:** `--radius` 8px → `rounded-sm/md/lg/xl/2xl` (6/8/12/16/24). **Elevation:** `shadow-xs/sm/md/lg/xl`.
**Type:** `text-2xs…text-4xl` (11 → 36px).

Usage: `bg-primary text-primary-foreground hover:bg-primary-hover`, `text-muted-foreground`,
`border-border`, `bg-card shadow-sm rounded-lg`, `bg-success-subtle text-success`, `fill-chart-2`.

## Component architecture
- **`components/enterprise/*`** is the only import surface for app screens (foldered: `data/`, `feedback/`, `forms/`, `layout/`, `security/`). It wraps shadcn/base-ui primitives with OCTIEN defaults.
- Screens compose: `EnterprisePage → EnterprisePageHeader → (KPIRow | FilterBar) → EnterpriseDataTable | EnterpriseReportTable | charts`.
- **No business logic in React.** Pages are thin over verified services (`lib/*`). This mirrors the frozen Sales/Procurement/Inventory pattern.

## Redesign method (module by module)
Global Layout → Navigation → Dashboard → Sales → Procurement → Inventory → Finance → CRM → HR →
Manufacturing → Administration → UCO → Salam Cola. For each: analyze → identify duplication → improve
UX → replace with `Enterprise*` → **preserve functionality** → verify responsive + dark + a11y → next.

## Brand assets
Single swap point: `lib/branding.ts` + `public/branding/*`. `mark` (octagon icon), `full` (lockup),
`icon` (favicon/PWA), `officialLogo` (raster-embedded, login splash only — kept out of the bundle).
Render via `<BrandLogo />` — the only place the logo appears.

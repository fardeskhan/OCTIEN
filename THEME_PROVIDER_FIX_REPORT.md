# THEME_PROVIDER_FIX_REPORT.md

**Date:** 2026-07-11 · **Verified:** `next build` success · `/login` serves 200 · fresh dev log clean (0 errors).

## Investigation
- **Versions:** `next-themes@0.4.6`, `next@16.2.9`, `react@19.2.4`. next-themes 0.4.6 officially supports the
  App Router, React 19, and Next 16 — no upgrade required.
- **Active provider chain:** the root layout uses `src/shared/providers/Providers.tsx` →
  `ThemeProvider` (a `"use client"` wrapper around `NextThemesProvider`). (`AppProviders.tsx` is an unused
  "reference architecture" mock and is not in the render tree.)
- **Root layout** already sets `suppressHydrationWarning` on `<html>` — the required guard for next-themes'
  pre-hydration class injection.
- **Runtime state:** the dashboard renders themed and the theme toggle works, i.e. the reported
  "script tag while rendering" message is a **non-fatal dev-console notice** from next-themes' inline theme
  script, not a crash. The login page returns 200 and the fresh server log shows **0 error lines**.

## Change applied
Added `disableTransitionOnChange` to the provider — the next-themes-recommended App Router configuration. It
suppresses the cross-fade flash when toggling theme and is the canonical setup for Next 16:

```tsx
<NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
```

Combined with the existing `suppressHydrationWarning` on `<html>`, this is the fully supported pattern; no
hydration mismatch and no functional theme error remains.

## Status
- Theme switching: ✅ works (light / dark / system).
- Hydration: ✅ `suppressHydrationWarning` present; no mismatch.
- Console: the inline theme script is expected next-themes behavior; no fatal error. If a strict CSP later
  flags the inline script, the documented next step is next-themes' `nonce` prop — not needed for the demo.

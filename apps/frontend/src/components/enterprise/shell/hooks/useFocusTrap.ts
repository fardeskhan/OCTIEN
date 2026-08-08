"use client";

import { useEffect, type RefObject } from "react";

interface Options {
  /** Element to focus first (defaults to the first focusable inside the container). */
  initialFocus?: RefObject<HTMLElement | null>;
  /** When true, Tab / Shift+Tab wrap inside the container (modal). Default true. */
  trapTab?: boolean;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Accessible focus management for shell overlays (mobile nav drawer, AI panel sheet). On activate it
 * moves focus inside the container (initial focus target or first focusable) and — when `trapTab` —
 * cycles Tab / Shift+Tab within it. On deactivate it restores focus to whatever was focused before
 * (typically the trigger), satisfying WCAG 2.4.3 Focus Order and 2.1.2 No Keyboard Trap (Escape/close
 * still exits). base-ui already provides this for its Dialog/Menu/Popover; this covers our own panels.
 */
export function useFocusTrap(active: boolean, containerRef: RefObject<HTMLElement | null>, opts: Options = {}) {
  const { initialFocus, trapTab = true } = opts;

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
      );

    // Initial focus shortly after open — a plain rAF fires mid-entry-animation while the panel is
    // still transformed off-screen, and browsers refuse to focus it; a short timeout lands after the
    // element is on-screen. `preventScroll` avoids a jump if it isn't fully settled.
    const timer = window.setTimeout(() => {
      const target = initialFocus?.current ?? focusables()[0] ?? container;
      target?.focus?.({ preventScroll: true });
    }, 80);

    const onKeyDown = (e: KeyboardEvent) => {
      if (!trapTab || e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) { e.preventDefault(); return; }
      const first = f[0];
      const last = f[f.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey && (activeEl === first || activeEl === container)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown, true);
      // Restore focus to the trigger (only if focus is still inside the container / on body).
      const active = document.activeElement;
      if (!active || active === document.body || container.contains(active)) {
        previouslyFocused?.focus?.();
      }
    };
  }, [active, containerRef, initialFocus, trapTab]);
}

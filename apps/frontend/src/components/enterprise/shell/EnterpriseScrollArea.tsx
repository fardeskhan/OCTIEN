"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** Classes for the inner scroll container (padding, etc.). */
  className?: string;
  /** Color the fade blends to — the surface behind the scroll area (a CSS color/var). */
  fadeColor?: string;
  /** Fade height. */
  fadeSize?: number;
  /**
   * Sizing mode.
   * - **`fill`** (default): the area is `flex-1` and fills the remaining height of a flex-column
   *   parent that has a DEFINITE height (e.g. the sidebar inside `h-screen`). Do NOT use inside an
   *   auto/`max-height` parent — `height:100%` won't resolve there and the area won't clip.
   * - **`cap`**: the scroller owns a `max-height` and grows with its content up to that cap, then
   *   scrolls. Works inside auto-height parents (popovers, dropdowns) with no percentage-height
   *   dependency. Pass the cap via `maxHeight`.
   */
  mode?: "fill" | "cap";
  /** CSS max-height for `cap` mode (e.g. "min(26rem, calc(100vh - 13rem))"). */
  maxHeight?: string;
  children: React.ReactNode;
}

/**
 * Reusable scroll surface for the design system: the ONE enterprise scrollbar
 * (`.scrollbar-enterprise` — blue, hidden-idle, hover/focus reveal) plus subtle top/bottom fade
 * overlays that indicate more content and auto-hide at the ends. `fill` mode for definite-height
 * flex parents (sidebar); `cap` mode for auto-height overlays (notification center, dropdowns) so
 * content is always clipped and scrolled, never spilled.
 */
export function EnterpriseScrollArea({
  className,
  fadeColor = "var(--sidebar)",
  fadeSize = 24,
  mode = "fill",
  maxHeight,
  children,
}: Props) {
  const cap = mode === "cap";
  const ref = useRef<HTMLDivElement>(null);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const overflow = el.scrollHeight - el.clientHeight > 2;
      setAtTop(!overflow || el.scrollTop <= 2);
      setAtBottom(!overflow || el.scrollTop + el.clientHeight >= el.scrollHeight - 2);
    };
    const raf = requestAnimationFrame(update); // initial measure after paint (avoids sync setState)
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  return (
    <div className={cn("relative overflow-hidden", cap ? "min-h-0" : "min-h-0 flex-1")}>
      <div
        aria-hidden="true"
        className={cn("pointer-events-none absolute inset-x-0 top-0 z-10 transition-opacity duration-200 motion-reduce:transition-none", atTop ? "opacity-0" : "opacity-100")}
        style={{ height: fadeSize, background: `linear-gradient(to bottom, ${fadeColor}, transparent)` }}
      />
      <div
        ref={ref}
        className={cn("scrollbar-enterprise overflow-y-auto overscroll-contain", cap ? "" : "h-full", className)}
        style={cap && maxHeight ? { maxHeight } : undefined}
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        className={cn("pointer-events-none absolute inset-x-0 bottom-0 z-10 transition-opacity duration-200 motion-reduce:transition-none", atBottom ? "opacity-0" : "opacity-100")}
        style={{ height: fadeSize, background: `linear-gradient(to top, ${fadeColor}, transparent)` }}
      />
    </div>
  );
}

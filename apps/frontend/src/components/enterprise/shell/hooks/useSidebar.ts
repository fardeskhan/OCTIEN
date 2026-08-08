"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "octien:sidebar-collapsed";

/**
 * Sidebar collapse (expanded 280px ↔ rail 72px). Persisted in localStorage; keyboard `[` toggles
 * (wired in the sidebar). Defaults to expanded; hydrates the stored preference after mount.
 */
export function useSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // One-time hydration of the client-only preference after mount (unavailable during SSR).
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(localStorage.getItem(KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const set = useCallback((next: boolean) => {
    setCollapsed(next);
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => set(!collapsed), [collapsed, set]);

  return { collapsed, toggle, setCollapsed: set };
}

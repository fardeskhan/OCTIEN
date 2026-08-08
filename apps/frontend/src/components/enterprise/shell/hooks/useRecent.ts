"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const KEY = "octien:recent";
const MAX = 8;

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Records the current route into the recent list (most-recent-first, deduped, capped). Mount once
 * (in the shell). Ignores the dashboard root and equal repeats.
 */
export function useTrackRecent() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname === "/") return;
    try {
      const next = [pathname, ...read().filter((p) => p !== pathname)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
      // Notify same-tab listeners (storage event only fires cross-tab).
      window.dispatchEvent(new Event("octien:recent"));
    } catch {
      /* ignore */
    }
  }, [pathname]);
}

/** Reads the recent list, refreshing on route change and on the same-tab update event. */
export function useRecent(): string[] {
  const [recent, setRecent] = useState<string[]>([]);
  const pathname = usePathname();
  useEffect(() => {
    // Hydrate + subscribe to same-tab/cross-tab updates (client-only storage).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecent(read());
    const onUpdate = () => setRecent(read());
    window.addEventListener("octien:recent", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("octien:recent", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [pathname]);
  return recent;
}

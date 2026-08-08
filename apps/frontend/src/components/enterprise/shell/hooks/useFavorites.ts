"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "octien:favorites";

/**
 * Favorite navigation routes. localStorage-backed today; this hook is the single seam a future
 * user-preferences service can replace with zero UI change. Stores an ordered list of hrefs.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // One-time hydration from client-only storage after mount (unavailable during SSR).
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setFavorites(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const write = (next: string[]) => {
    setFavorites(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const toggle = useCallback((href: string) => {
    setFavorites((prev) => {
      const next = prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback((href: string) => favorites.includes(href), [favorites]);

  return { favorites, isFavorite, toggle, setFavorites: write, ready };
}

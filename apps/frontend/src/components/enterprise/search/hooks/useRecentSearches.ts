"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "octien:recent-searches";
const MAX = 6;

/** Recent SEARCH QUERIES (distinct from recent routes). localStorage seam → future user-prefs sync. */
export function useRecentSearches() {
  const [searches, setSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setSearches(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const add = useCallback((q: string) => {
    const query = q.trim();
    if (!query || query.length < 2) return;
    setSearches((prev) => {
      const next = [query, ...prev.filter((s) => s !== query)].slice(0, MAX);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const remove = useCallback((q: string) => {
    setSearches((prev) => {
      const next = prev.filter((s) => s !== q);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSearches([]);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return { searches, add, remove, clear };
}

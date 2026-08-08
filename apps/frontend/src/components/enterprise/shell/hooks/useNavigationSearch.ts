"use client";

import { useMemo, useState } from "react";
import { navigation, canSee, type NavItem } from "@/lib/navigation";

export type NavSearchResult = NavItem & { group: string };

/**
 * In-sidebar navigation search. Fuzzy-ish substring match over the nav model (label + keywords),
 * permission-filtered, live items only. Returns `null` when the query is empty (= show normal nav).
 * This searches NAVIGATION only — distinct from the global entity search / command palette.
 */
export function useNavigationSearch(permissions: string[]) {
  const [query, setQuery] = useState("");

  const results = useMemo<NavSearchResult[] | null>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const out: NavSearchResult[] = [];
    for (const group of navigation) {
      for (const item of group.items) {
        if (!item.href || (item.status ?? "live") !== "live" || !canSee(item, permissions)) continue;
        const hay = [item.label, group.label, ...(item.keywords ?? [])].join(" ").toLowerCase();
        if (hay.includes(q)) out.push({ ...item, group: group.label });
      }
    }
    return out;
  }, [query, permissions]);

  return { query, setQuery, results };
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { runSearch, groupResults, type SearchSource } from "../lib/search";

interface Options {
  sources: SearchSource[];
  permissions: string[];
  /** Preferred section order. */
  order: string[];
  debounceMs?: number;
  /** Skip running (e.g. when the surface is closed). */
  enabled?: boolean;
}

/**
 * Reusable search controller — debounces the query, runs the unified `runSearch` over the given
 * sources, cancels stale/in-flight requests (last-write-wins), groups + orders results, and reports a
 * count + loading state. Async-source ready (entity/DB/AI). Shared by Global Search (and adoptable by
 * the palette). Virtualization-ready: the caller renders `groups` however it likes.
 */
export function useSearchController({ sources, permissions, order, debounceMs = 200, enabled = true }: Options) {
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<{ group: string; items: import("../lib/search").SearchItem[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const id = ++reqId.current;
    const q = query;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const t = setTimeout(
      () => {
        runSearch(sources, { query: q, permissions }).then((items) => {
          if (id !== reqId.current) return; // stale — a newer query superseded this
          setGroups(groupResults(items, order));
          setLoading(false);
        });
      },
      q ? debounceMs : 0,
    );
    return () => clearTimeout(t);
  }, [query, sources, permissions, order, debounceMs, enabled]);

  const count = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups]);

  return { query, setQuery, groups, loading, count };
}

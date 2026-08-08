/**
 * Enterprise Search Platform — core types + runner.
 *
 * ONE search abstraction that every surface consumes: command palette, global search, navigation
 * search, recent, favorites, and future plugins (AI assistant, documentation, entity search). The
 * platform is decoupled from navigation — navigation is just one registered SOURCE. Callers use a
 * single `search(query)`; the provider fans out to all registered sources and merges/ranks results.
 */
import type { LucideIcon } from "lucide-react";

export type SearchItemType =
  | "navigation"
  | "command"
  | "action"
  | "calculator"
  | "recent"
  | "favorite"
  | "documentation"
  // entity types — architecture in place; data sources wired per module later
  | "customer"
  | "product"
  | "order"
  | "invoice"
  | "supplier"
  | "warehouse"
  | "page";

/** A single unified search result — a navigable target OR an executable action. */
export interface SearchItem {
  id: string;
  type: SearchItemType;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Section heading in the results list. */
  group: string;
  keywords?: string[];
  /** Navigate target (mutually exclusive-ish with `run`). */
  href?: string;
  /** Execute an action on select. */
  run?: () => void | Promise<void>;
  /** Ranking score (set by the source; higher = better). */
  score?: number;
  /** Trailing hint (e.g. "↵", "=", a shortcut). */
  hint?: string;
}

/** Runtime context passed to every source. */
export interface SearchContext {
  query: string;
  permissions: string[];
}

/**
 * A search SOURCE (plugin). Given a query, returns items. Sources needing runtime deps (router,
 * theme, business switch, DB) capture them in a closure when the provider builds them. May be async
 * (entity/DB/AI sources).
 */
export type SearchSource = (ctx: SearchContext) => SearchItem[] | Promise<SearchItem[]>;

/** Run all sources, flatten, drop zero-score items, and rank. */
export async function runSearch(sources: SearchSource[], ctx: SearchContext): Promise<SearchItem[]> {
  const settled = await Promise.all(
    sources.map(async (s) => {
      try {
        return await s(ctx);
      } catch {
        return [] as SearchItem[];
      }
    }),
  );
  return settled
    .flat()
    .filter((i) => (i.score ?? 1) > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/** Group ranked items by their `group`, preserving the given section order then rank within. */
export function groupResults(items: SearchItem[], order: string[]): { group: string; items: SearchItem[] }[] {
  const map = new Map<string, SearchItem[]>();
  for (const it of items) {
    const arr = map.get(it.group) ?? [];
    arr.push(it);
    map.set(it.group, arr);
  }
  const seen = new Set<string>();
  const out: { group: string; items: SearchItem[] }[] = [];
  for (const g of order) {
    if (map.has(g)) {
      out.push({ group: g, items: map.get(g)! });
      seen.add(g);
    }
  }
  for (const [g, arr] of map) {
    if (!seen.has(g)) out.push({ group: g, items: arr });
  }
  return out;
}

/** Safe arithmetic evaluator for the calculator source. Returns a formatted result or null. */
export function tryCalculate(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  // Only digits, whitespace, and arithmetic operators; require at least one operator.
  if (!/^[\d\s.+\-*/%()]+$/.test(raw)) return null;
  if (!/[+\-*/%]/.test(raw)) return null;
  const expr = raw.replace(/(\d+(?:\.\d+)?)\s*%/g, "($1/100)"); // "15%" → (15/100)
  try {
    const val = Function(`"use strict"; return (${expr});`)();
    if (typeof val !== "number" || !isFinite(val)) return null;
    return String(Math.round(val * 1e6) / 1e6);
  } catch {
    return null;
  }
}

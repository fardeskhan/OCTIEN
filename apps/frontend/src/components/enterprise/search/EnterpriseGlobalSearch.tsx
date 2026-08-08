"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useEnterpriseSearch } from "./EnterpriseSearchProvider";
import { useSearchController } from "./hooks/useSearchController";
import { useRecentSearches } from "./hooks/useRecentSearches";
import { EnterpriseSearchResults } from "./EnterpriseSearchResults";
import { EnterpriseSearchRecent } from "./EnterpriseSearchRecent";
import { EnterpriseSearchEmpty } from "./EnterpriseSearchEmpty";
import { EnterpriseSearchLoading } from "./EnterpriseSearchLoading";
import { EnterpriseSearchFilters } from "./EnterpriseSearchFilters";
import type { SearchItem } from "./lib/search";

/**
 * Enterprise Global Search — the ENTITY search surface (distinct from the command palette). A large
 * floating panel over the ONE search platform (`searchSources`), with debounced/cancelable async
 * search, category filters, match highlighting, recent searches, result count, and honest
 * empty/loading states. Opens via the header search bar or "/". Going live = adding a data source.
 */
export function EnterpriseGlobalSearch() {
  const { searchOpen, setSearchOpen, searchSources, searchOrder, permissions } = useEnterpriseSearch();
  const router = useRouter();
  const { searches, add, remove, clear } = useRecentSearches();
  const [filter, setFilter] = useState("All");

  const { query, setQuery, groups, loading, count } = useSearchController({
    sources: searchSources,
    permissions,
    order: searchOrder,
    enabled: searchOpen,
    debounceMs: 200,
  });

  const categories = useMemo(() => groups.map((g) => g.group).filter((g) => g !== "Calculator"), [groups]);
  const hasQuery = query.trim().length > 0;

  const close = () => {
    setSearchOpen(false);
    setQuery("");
    setFilter("All");
  };

  const onSelect = (item: SearchItem) => {
    if (hasQuery) add(query);
    close();
    if (item.run) void item.run();
    else if (item.href) router.push(item.href);
  };

  return (
    <Dialog open={searchOpen} onOpenChange={(o) => (o ? setSearchOpen(true) : close())}>
      <DialogContent className="top-[10vh] max-h-[min(70vh,760px)] w-[calc(100%-2rem)] max-w-[46rem] translate-y-0 gap-0 overflow-hidden rounded-xl p-0 shadow-xl ring-1 ring-foreground/[0.08] sm:max-w-[46rem]">
        <DialogTitle className="sr-only">Global search</DialogTitle>
        <DialogDescription className="sr-only">Search customers, suppliers, products, orders, invoices, warehouses, and pages.</DialogDescription>
        <Command shouldFilter={false} loop className="flex flex-col">
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-[1.125rem] shrink-0 text-muted-foreground" aria-hidden="true" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search customers, products, orders, invoices…"
              className="h-11 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
            />
            {hasQuery && <span className="shrink-0 tabular-nums text-2xs text-muted-foreground">{count} result{count === 1 ? "" : "s"}</span>}
          </div>

          {hasQuery && <EnterpriseSearchFilters categories={categories} active={filter} onChange={setFilter} />}

          <Command.List className="scrollbar-enterprise max-h-[min(60vh,34rem)] min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5">
            {!hasQuery ? (
              <EnterpriseSearchRecent searches={searches} onSelect={(q) => setQuery(q)} onRemove={remove} onClear={clear} />
            ) : loading && groups.length === 0 ? (
              <EnterpriseSearchLoading />
            ) : count === 0 ? (
              <EnterpriseSearchEmpty query={query} />
            ) : (
              <EnterpriseSearchResults groups={groups} query={query} onSelect={onSelect} filter={filter} />
            )}
          </Command.List>

          <div className="flex items-center gap-3.5 border-t border-border bg-muted/30 px-4 py-2 text-2xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><kbd className="rounded border border-border/70 bg-background px-1 py-0.5">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1.5"><kbd className="rounded border border-border/70 bg-background px-1 py-0.5">↵</kbd> open</span>
            <span className="ml-auto flex items-center gap-1.5"><kbd className="rounded border border-border/70 bg-background px-1 py-0.5">⌘K</kbd> commands</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

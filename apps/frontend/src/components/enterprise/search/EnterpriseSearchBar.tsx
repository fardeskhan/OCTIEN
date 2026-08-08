"use client";

import { Search } from "lucide-react";
import { useEnterpriseSearch } from "./EnterpriseSearchProvider";

/**
 * Header search trigger. Opens **Global Search** (entity search). The command palette (actions) is a
 * separate surface on ⌘K — the standard split: search box finds things, ⌘K does things.
 */
export function EnterpriseSearchBar() {
  const { setSearchOpen } = useEnterpriseSearch();
  return (
    <button
      type="button"
      onClick={() => setSearchOpen(true)}
      aria-label="Search — customers, products, orders and more"
      className="group flex h-8 w-[210px] items-center gap-2 rounded-lg border border-border/70 bg-muted/40 pl-2.5 pr-1.5 text-sm text-muted-foreground shadow-xs transition-[color,background-color,border-color,box-shadow] duration-150 hover:border-border-strong hover:bg-background hover:text-foreground focus-visible:border-ring focus-visible:bg-background focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-[248px]"
    >
      <Search className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
      <span className="flex-1 truncate text-left">Search anything…</span>
      <kbd className="hidden shrink-0 items-center rounded-md border border-border/70 bg-background px-1.5 font-sans text-2xs leading-[17px] text-muted-foreground/70 shadow-xs sm:inline-flex">/</kbd>
    </button>
  );
}

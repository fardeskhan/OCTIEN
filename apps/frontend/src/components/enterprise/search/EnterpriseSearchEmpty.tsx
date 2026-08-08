"use client";

import { SearchX } from "lucide-react";

/** Empty state for global search (no results for a non-empty query). */
export function EnterpriseSearchEmpty({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-muted/40">
        <SearchX className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="mt-3.5 text-sm font-medium text-foreground">No results{query ? ` for “${query}”` : ""}</p>
      <p className="mt-1 max-w-[17rem] text-xs leading-relaxed text-muted-foreground">Try a different term, or press ⌘K for commands.</p>
    </div>
  );
}

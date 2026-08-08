"use client";

import { cn } from "@/lib/utils";

interface Props {
  /** Category labels available in the current results (group names). */
  categories: string[];
  active: string; // "All" or a category
  onChange: (c: string) => void;
}

/** Category filter chips for global search — narrows results to one result group. */
export function EnterpriseSearchFilters({ categories, active, onChange }: Props) {
  if (categories.length <= 1) return null;
  const chips = ["All", ...categories];
  return (
    <div className="scrollbar-enterprise flex items-center gap-1.5 overflow-x-auto border-b border-border px-3 py-2" role="tablist" aria-label="Filter results by category">
      {chips.map((c) => {
        const selected = active === c;
        return (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(c)}
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                : "border-border bg-transparent text-muted-foreground hover:border-border-strong hover:bg-muted hover:text-foreground",
            )}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}

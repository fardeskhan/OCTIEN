"use client";

import { Clock, X } from "lucide-react";

interface Props {
  searches: string[];
  onSelect: (q: string) => void;
  onRemove: (q: string) => void;
  onClear: () => void;
}

/** Recent search queries — shown when the global-search query is empty. */
export function EnterpriseSearchRecent({ searches, onSelect, onRemove, onClear }: Props) {
  if (searches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-muted/40">
          <Clock className="size-5 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="mt-3.5 max-w-[17rem] text-xs leading-relaxed text-muted-foreground">Search customers, products, orders, invoices and more.</p>
      </div>
    );
  }
  return (
    <div className="p-2">
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Recent searches</span>
        <button type="button" onClick={onClear} className="text-2xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline">
          Clear
        </button>
      </div>
      {searches.map((q) => (
        <div key={q} className="group/recent flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-accent">
          <Clock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <button type="button" onClick={() => onSelect(q)} className="flex-1 truncate text-left text-foreground focus-visible:outline-none">
            {q}
          </button>
          <button
            type="button"
            onClick={() => onRemove(q)}
            aria-label={`Remove ${q} from recent searches`}
            className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/recent:opacity-100"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

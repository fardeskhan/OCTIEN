"use client";

import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import type { SearchItem } from "./lib/search";

/** Highlights the matched substring of `text` against `query`. */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-primary/15 px-0 text-primary">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

/** A single global-search result row (presentational; selection is handled by the list item). */
export function EnterpriseSearchResult({ item, query }: { item: SearchItem; query: string }) {
  const Icon = item.icon;
  return (
    <div className="flex items-center gap-3">
      {Icon && (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-transparent bg-muted/60 text-muted-foreground transition-colors group-data-[selected=true]:border-border group-data-[selected=true]:bg-background group-data-[selected=true]:text-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">
          <Highlight text={item.title} query={query} />
        </div>
        {item.subtitle && <div className="truncate text-xs text-muted-foreground">{item.subtitle}</div>}
      </div>
      {item.hint ? (
        <kbd className="shrink-0 rounded-md border border-border/70 bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground">{item.hint}</kbd>
      ) : (
        <ArrowRight className={cn("size-4 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity", "group-data-[selected=true]:opacity-100")} aria-hidden="true" />
      )}
    </div>
  );
}

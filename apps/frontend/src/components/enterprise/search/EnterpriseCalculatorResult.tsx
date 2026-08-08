"use client";

import { Command } from "cmdk";
import { Equal, Copy } from "lucide-react";
import type { SearchItem } from "./lib/search";

/**
 * Calculator result rendered as a premium widget rather than a list row. Shows the expression, an
 * equals rule, and the large monospaced result with a copy affordance. Selecting it copies the value
 * (the item's `run`). Reused by the command palette and global search.
 */
export function EnterpriseCalculatorResult({ item, onSelect }: { item: SearchItem; onSelect: (item: SearchItem) => void }) {
  const expression = item.subtitle?.replace(/=\s*$/, "").trim() ?? "";
  return (
    <Command.Item
      value={item.id}
      onSelect={() => onSelect(item)}
      className="group mb-1.5 flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-gradient-to-br from-primary-subtle/60 to-transparent px-4 py-3 data-[selected=true]:border-primary/40 data-[selected=true]:from-primary-subtle"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Equal className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        {expression && <div className="truncate font-mono text-xs text-muted-foreground">{expression} =</div>}
        <div className="truncate font-mono text-xl font-semibold tabular-nums text-foreground">{item.title}</div>
      </div>
      <span className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-2xs font-medium text-muted-foreground transition-colors group-data-[selected=true]:border-primary/30 group-data-[selected=true]:text-primary">
        <Copy className="size-3" aria-hidden="true" />
        Copy
      </span>
    </Command.Item>
  );
}

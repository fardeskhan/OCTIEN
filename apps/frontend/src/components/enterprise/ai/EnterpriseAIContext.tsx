"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAI } from "./EnterpriseAIProvider";

/**
 * Context strip — shows what the assistant is currently scoped to (pinned route context + selected
 * entities). Collapsible. The values come from the provider (`context`); pinned page/module/workspace
 * are real, selected entities are placeholders until wired to selection state. Presentation only.
 */
export function EnterpriseAIContext() {
  const { context } = useAI();
  const [open, setOpen] = useState(true);
  const pinned = context.filter((c) => c.pinned);
  const selected = context.filter((c) => !c.pinned);

  return (
    <div className="border-b border-border bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronDown className={cn("size-3 transition-transform", !open && "-rotate-90")} aria-hidden="true" />
        Context
        <span className="ml-1 rounded-full bg-muted px-1.5 text-2xs font-medium tabular-nums text-muted-foreground/70">{context.length}</span>
      </button>

      {open && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2.5">
          {[...pinned, ...selected].map((c) => (
            <span
              key={c.id}
              title={`${c.label}: ${c.value}`}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-2xs",
                c.pinned ? "border-primary/20 bg-primary/5 text-foreground" : "border-border bg-card text-muted-foreground",
              )}
            >
              <c.icon className={cn("size-3 shrink-0", c.pinned ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
              <span className="text-muted-foreground/70">{c.label}</span>
              <span className="truncate font-medium text-foreground">{c.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

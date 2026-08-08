"use client";

import { Sparkles } from "lucide-react";

/**
 * Empty state for a fresh conversation — matches the shell's framed empty-state pattern
 * (size-12 framed icon, mt-3.5 title, max-w body). Suggestions render below it from the prompt area.
 */
export function EnterpriseAIEmpty() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-muted/40">
        <Sparkles className="size-5 text-primary" aria-hidden="true" />
      </div>
      <p className="mt-3.5 text-sm font-medium text-foreground">Ask OCTIEN AI</p>
      <p className="mt-1 max-w-[17rem] text-xs leading-relaxed text-muted-foreground">
        Ask about sales, inventory, finance, or anything on this page. Your current context is attached below.
      </p>
    </div>
  );
}

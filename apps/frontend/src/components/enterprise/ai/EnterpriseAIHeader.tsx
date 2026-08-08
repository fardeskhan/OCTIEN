"use client";

import { Sparkles, PanelRightClose } from "lucide-react";
import { EnterpriseAIToolbar } from "./EnterpriseAIToolbar";
import { useAI } from "./EnterpriseAIProvider";

/**
 * AI panel header — identity (OCTIEN AI + a "Preview" tag since it's not connected), the toolbar, and
 * the collapse/close control. Presentation only.
 */
export function EnterpriseAIHeader() {
  const { setOpen } = useAI();
  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        <h2 className="truncate text-sm font-semibold text-foreground">OCTIEN AI</h2>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide text-muted-foreground/70">Preview</span>
      </div>
      <div className="flex items-center gap-0.5">
        <EnterpriseAIToolbar />
        <div className="mx-0.5 h-4 w-px bg-border" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close AI panel"
          title="Close (Esc)"
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PanelRightClose className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

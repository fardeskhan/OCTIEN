"use client";

import { useAI } from "./EnterpriseAIProvider";
import { SAMPLE_SUGGESTIONS } from "./lib/ai";

/**
 * Suggested-prompt chips shown above the composer. Config-driven (`SAMPLE_SUGGESTIONS`). Selecting a
 * chip drops its text into the draft — no request is made (architecture only).
 */
export function EnterpriseAISuggestions() {
  const { setDraft } = useAI();
  return (
    <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 scrollbar-enterprise">
      {SAMPLE_SUGGESTIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => setDraft(s.label)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-xs transition-colors hover:border-border-strong hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <s.icon className="size-3.5 text-primary" aria-hidden="true" />
          {s.label}
        </button>
      ))}
    </div>
  );
}

"use client";

import { Sparkles } from "lucide-react";

/**
 * Assistant "thinking" indicator — a three-dot pulse in the assistant message frame. Shown while the
 * platform is busy (never triggered by real logic yet). Motion is reduced-motion aware.
 */
export function EnterpriseAILoading() {
  return (
    <div className="flex gap-2" aria-label="Assistant is thinking" role="status">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Sparkles className="size-4" aria-hidden="true" />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-border bg-card px-3.5 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-muted-foreground/60 motion-safe:animate-bounce"
            style={{ animationDelay: `${i * 120}ms`, animationDuration: "1s" }}
          />
        ))}
      </div>
    </div>
  );
}

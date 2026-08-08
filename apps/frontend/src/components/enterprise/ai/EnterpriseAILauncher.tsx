"use client";

import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAI } from "./EnterpriseAIProvider";

/**
 * Header entry point for the AI workspace — toggles the panel and reflects its open state. Keyboard
 * shortcut ⌘J / Ctrl+J. Matches the 32px header control system.
 */
export function EnterpriseAILauncher() {
  const { open, toggle } = useAI();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "j" || e.key === "J")) { e.preventDefault(); toggle(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const trigger = (
    <button
      type="button"
      onClick={toggle}
      aria-label="OCTIEN AI"
      aria-pressed={open}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        open ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Sparkles className="size-[1.125rem]" aria-hidden="true" />
    </button>
  );

  return (
    <Tooltip>
      <TooltipTrigger render={trigger} />
      <TooltipContent side="bottom" sideOffset={6}>
        OCTIEN AI
        <kbd data-slot="kbd" className="ml-1 rounded bg-background/20 px-1 text-2xs">⌘J</kbd>
      </TooltipContent>
    </Tooltip>
  );
}

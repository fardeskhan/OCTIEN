"use client";

import { useState } from "react";
import { Sparkles, Wrench, ChevronRight, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIMessage } from "./lib/ai";

/**
 * Renders a single conversation message by role. Pure presentation — the six roles (user, assistant,
 * tool, system, thinking, error) each get a distinct, token-driven treatment. `thinking` is collapsed
 * by default. No message ever contains live AI output yet; this only defines the visual grammar.
 */
export function EnterpriseAIMessage({ message }: { message: AIMessage }) {
  switch (message.role) {
    case "user":
      return (
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm leading-relaxed text-primary-foreground shadow-xs">
            {message.content}
          </div>
        </div>
      );

    case "assistant":
      return (
        <div className="flex gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-border bg-card px-3.5 py-2 text-sm leading-relaxed text-foreground">
            {message.content}
          </div>
        </div>
      );

    case "tool":
      return (
        <div className="flex items-start gap-2 pl-9">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Wrench className="size-3" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5">
            {message.tool && <div className="font-mono text-2xs font-medium text-muted-foreground">{message.tool}</div>}
            <div className="text-xs leading-relaxed text-muted-foreground">{message.content}</div>
          </div>
        </div>
      );

    case "system":
      return (
        <div className="flex items-center justify-center gap-1.5 px-4 py-0.5 text-center text-2xs text-muted-foreground">
          <Info className="size-3 shrink-0" aria-hidden="true" />
          <span>{message.content}</span>
        </div>
      );

    case "thinking":
      return <ThinkingMessage message={message} />;

    case "error":
      return (
        <div className="flex gap-2.5 pl-9">
          <div className="min-w-0 flex-1 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
              Something went wrong
            </div>
            <div className="mt-0.5 text-xs leading-relaxed text-destructive/90">{message.content}</div>
          </div>
        </div>
      );

    default:
      return null;
  }
}

function ThinkingMessage({ message }: { message: AIMessage }) {
  const [open, setOpen] = useState(Boolean(message.defaultOpen));
  return (
    <div className="pl-9">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-2xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRight className={cn("size-3 transition-transform", open && "rotate-90")} aria-hidden="true" />
        {open ? "Hide reasoning" : "Show reasoning"}
      </button>
      {open && (
        <div className="mt-1 border-l-2 border-border pl-2.5 text-xs leading-relaxed text-muted-foreground/90">
          {message.content}
        </div>
      )}
    </div>
  );
}

"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useAI } from "./EnterpriseAIProvider";
import { COMPOSER_ACTIONS, MENTION_TARGETS, SEND_ICON } from "./lib/ai";

/**
 * Premium prompt composer — a textarea plus attach / mention / voice / send affordances. Every control
 * is a PLACEHOLDER: no request is sent, voice is disabled, mention inserts a token into the draft. The
 * architecture (draft state, actions, keyboard) is real so a future runtime only has to implement
 * `send`. The composer input is exposed via ref so the panel can focus it on open.
 */
export const EnterpriseAIPromptBar = forwardRef<HTMLTextAreaElement>(function EnterpriseAIPromptBar(_props, ref) {
  const { draft, setDraft } = useAI();
  const attach = COMPOSER_ACTIONS.find((a) => a.id === "attach")!;
  const voice = COMPOSER_ACTIONS.find((a) => a.id === "voice")!;
  const canSend = draft.trim().length > 0;

  // Placeholder submit — intentionally does nothing yet (no AI backend).
  const send = () => { /* wired to the AI runtime in a future increment */ };

  return (
    <div className="border-t border-border bg-card p-3">
      <div className="rounded-xl border border-border bg-background shadow-xs transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring">
        <textarea
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (canSend) send(); }
          }}
          rows={1}
          placeholder="Ask OCTIEN AI…  (placeholder — not connected)"
          aria-label="Message OCTIEN AI"
          className="scrollbar-enterprise block max-h-40 w-full resize-none bg-transparent px-3 pt-2.5 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        <div className="flex items-center gap-0.5 px-1.5 pb-1.5">
          {/* Attach */}
          <ComposerIcon label={attach.label}>
            <attach.icon className="size-4" aria-hidden="true" />
          </ComposerIcon>

          {/* Mention */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Mention"
            >
              <MentionIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Mention</DropdownMenuLabel>
              {MENTION_TARGETS.map((m) => (
                <DropdownMenuItem key={m.id} className="gap-2 text-xs" onClick={() => setDraft(draft ? `${draft} @${m.label} ` : `@${m.label} `)}>
                  <m.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  {m.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Voice (disabled) */}
          <ComposerIcon label={voice.label} disabled>
            <voice.icon className="size-4" aria-hidden="true" />
          </ComposerIcon>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-2xs text-muted-foreground sm:inline">
              <kbd className="rounded border border-border/70 bg-muted px-1 py-0.5 text-2xs">↵</kbd> to send
            </span>
            <Button
              type="button"
              size="icon-sm"
              onClick={send}
              disabled={!canSend}
              aria-label="Send message"
              className="rounded-lg"
            >
              <SEND_ICON className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

function ComposerIcon({ label, disabled, children }: { label: string; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled ? "cursor-not-allowed opacity-40" : "hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function MentionIcon() {
  const AtSign = COMPOSER_ACTIONS.find((a) => a.id === "mention")!.icon;
  return <AtSign className="size-4" aria-hidden="true" />;
}

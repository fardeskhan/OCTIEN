"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/components/enterprise/shell/hooks/useFocusTrap";
import { useAI } from "./EnterpriseAIProvider";
import { EnterpriseAIHeader } from "./EnterpriseAIHeader";
import { EnterpriseAIContext } from "./EnterpriseAIContext";
import { EnterpriseAIConversation } from "./EnterpriseAIConversation";
import { EnterpriseAISuggestions } from "./EnterpriseAISuggestions";
import { EnterpriseAIPromptBar } from "./EnterpriseAIPromptBar";
import { AI_WIDTH_MIN, AI_WIDTH_MAX, AI_WIDTH_STEP } from "./lib/ai";

/** SSR-safe media query — false until mounted, then tracks the query. */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatches(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return matches;
}

/**
 * The AI workspace panel — composition root. Responsive:
 *  • Desktop (≥lg): docked as an in-flow flex sibling; width is applied inline (robust — no fragile
 *    arbitrary CSS) and remembered; a keyboard-accessible handle resizes it.
 *  • Tablet/Mobile (<lg): a fixed overlay with a backdrop (side sheet on tablet, full-screen on
 *    mobile), no resize.
 * Escape closes, focus moves to the composer on open, `complementary` landmark. Frozen shell tokens
 * + `EnterpriseScrollArea` only. No AI logic here.
 */
export function EnterpriseAIPanel() {
  const { open, setOpen, width, setWidth } = useAI();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const panelRef = useRef<HTMLElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [dragging, setDragging] = useState(false);

  // Focus the composer on open; trap Tab when the panel is a modal overlay (tablet/mobile); restore
  // focus to the launcher on close. Docked (desktop) is non-modal, so Tab is not trapped.
  useFocusTrap(open, panelRef, { initialFocus: composerRef, trapTab: !isDesktop });

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // Pointer resize (docked only). Width = distance from cursor to the right edge of the viewport.
  // Coalesced to one setWidth per animation frame so a fast drag can't queue a reflow per pointermove
  // event; the listener is passive since it never calls preventDefault.
  useEffect(() => {
    if (!dragging) return;
    let raf = 0;
    let latestX = 0;
    const apply = () => { raf = 0; setWidth(window.innerWidth - latestX); };
    const onMove = (e: PointerEvent) => { latestX = e.clientX; if (!raf) raf = requestAnimationFrame(apply); };
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [dragging, setWidth]);

  if (!open) return null;

  const onHandleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); setWidth(width + AI_WIDTH_STEP); }
    else if (e.key === "ArrowRight") { e.preventDefault(); setWidth(width - AI_WIDTH_STEP); }
    else if (e.key === "Home") { e.preventDefault(); setWidth(AI_WIDTH_MAX); }
    else if (e.key === "End") { e.preventDefault(); setWidth(AI_WIDTH_MIN); }
  };

  return (
    <>
      {/* Backdrop — overlay modes only (tablet/mobile). */}
      {!isDesktop && (
        <div
          className="fixed inset-0 z-40 bg-foreground/25 backdrop-blur-sm animate-overlay-fade"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        ref={panelRef}
        aria-label="OCTIEN AI assistant"
        style={isDesktop ? { width: `${width}px` } : undefined}
        className={cn(
          // `transition-none` keeps resizing instant (a bare `duration-*` would otherwise animate the
          // width via the CSS-initial `transition-property: all`). Entry uses `animation`, not
          // transition, so it is unaffected.
          "z-50 flex min-w-0 flex-col border-l border-border bg-card transition-none",
          isDesktop
            ? "relative shrink-0 shadow-none"
            : "fixed inset-y-0 right-0 w-full shadow-xl sm:w-[24rem]",
          // Docked appears with a subtle fade; the overlay (sheet) slides in from the right.
          !dragging && (isDesktop ? "animate-overlay-fade" : "animate-drawer-right"),
        )}
      >
        {/* Resize handle — docked only, keyboard accessible. */}
        {isDesktop && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize AI panel"
            aria-valuenow={width}
            aria-valuemin={AI_WIDTH_MIN}
            aria-valuemax={AI_WIDTH_MAX}
            tabIndex={0}
            onPointerDown={(e) => { e.preventDefault(); setDragging(true); }}
            onKeyDown={onHandleKey}
            className="group absolute inset-y-0 -left-2 z-10 w-4 cursor-col-resize touch-none"
          >
            <span
              className={cn(
                "absolute inset-y-0 left-2 w-0.5 -translate-x-1/2 rounded-full transition-colors",
                dragging ? "bg-primary" : "bg-transparent group-hover:bg-primary/50 group-focus-visible:bg-primary",
              )}
            />
          </div>
        )}

        <EnterpriseAIHeader />
        <EnterpriseAIContext />
        <div className="flex min-h-0 flex-1 flex-col">
          <EnterpriseAIConversation />
        </div>
        <EnterpriseAISuggestions />
        <EnterpriseAIPromptBar ref={composerRef} />
      </aside>
    </>
  );
}

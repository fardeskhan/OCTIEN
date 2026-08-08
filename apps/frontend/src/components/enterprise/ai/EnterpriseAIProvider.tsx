"use client";

/**
 * AI workspace — the state owner. Holds ONLY UI state: panel open/width, the (placeholder) message
 * list, the context the assistant is scoped to, the draft prompt. It knows nothing about any model
 * or transport; a future runtime swaps `messages` for real output and everything below is unchanged.
 * Persists panel open + width to localStorage so the workspace feels permanent across sessions.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { getBreadcrumbs } from "@/lib/navigation";
import {
  type AIMessage,
  type AIContextItem,
  SAMPLE_CONVERSATION,
  PLACEHOLDER_SELECTIONS,
  PINNED_ICONS,
  AI_WIDTH_DEFAULT,
  AI_WIDTH_MIN,
  AI_WIDTH_MAX,
} from "./lib/ai";

const OPEN_KEY = "octien:ai-open";
const WIDTH_KEY = "octien:ai-width";

interface AIContextValue {
  open: boolean;
  setOpen: (o: boolean) => void;
  toggle: () => void;

  width: number;
  setWidth: (w: number) => void;

  messages: AIMessage[];
  /** True when the conversation is empty (renders the empty state). */
  isEmpty: boolean;
  /** Placeholder: clears the conversation (New chat / Clear). */
  newChat: () => void;

  /** What the assistant is currently scoped to (pinned route context + selected entities). */
  context: AIContextItem[];

  draft: string;
  setDraft: (v: string) => void;

  /** Placeholder loading flag for the typing indicator (never set true by real logic yet). */
  busy: boolean;
}

const clampWidth = (w: number) => Math.min(AI_WIDTH_MAX, Math.max(AI_WIDTH_MIN, Math.round(w)));

const Ctx = createContext<AIContextValue | null>(null);

export function EnterpriseAIProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpenState] = useState(false);
  const [width, setWidthState] = useState(AI_WIDTH_DEFAULT);
  const [messages, setMessages] = useState<AIMessage[]>(SAMPLE_CONVERSATION);
  const [draft, setDraft] = useState("");

  // Hydrate persisted panel state after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      const o = window.localStorage.getItem(OPEN_KEY);
      const w = window.localStorage.getItem(WIDTH_KEY);
      // Hydration from localStorage — the intended "sync from external store on mount" pattern.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (o === "true") setOpenState(true);
      if (w) setWidthState(clampWidth(Number(w)));
    } catch {
      /* ignore */
    }
  }, []);

  const setOpen = useCallback((o: boolean) => {
    setOpenState(o);
    try { window.localStorage.setItem(OPEN_KEY, String(o)); } catch { /* ignore */ }
  }, []);
  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);

  const setWidth = useCallback((w: number) => {
    const c = clampWidth(w);
    setWidthState(c);
    try { window.localStorage.setItem(WIDTH_KEY, String(c)); } catch { /* ignore */ }
  }, []);

  const newChat = useCallback(() => { setMessages([]); setDraft(""); }, []);

  // Context = pinned route context (real, cheap) + placeholder selected entities.
  const context = useMemo<AIContextItem[]>(() => {
    const crumbs = getBreadcrumbs(pathname ?? "/");
    const page = crumbs[crumbs.length - 1]?.label ?? "Dashboard";
    const moduleLabel = crumbs.length > 1 ? crumbs[1].label : "Overview";
    const pinned: AIContextItem[] = [
      { id: "ctx-page", label: "Page", value: page, icon: PINNED_ICONS.page, pinned: true },
      { id: "ctx-module", label: "Module", value: moduleLabel, icon: PINNED_ICONS.module, pinned: true },
      { id: "ctx-workspace", label: "Workspace", value: "COSMY UCO", icon: PINNED_ICONS.workspace, pinned: true },
    ];
    return [...pinned, ...PLACEHOLDER_SELECTIONS];
  }, [pathname]);

  const value = useMemo<AIContextValue>(
    () => ({
      open, setOpen, toggle,
      width, setWidth,
      messages, isEmpty: messages.length === 0, newChat,
      context,
      draft, setDraft,
      busy: false,
    }),
    [open, setOpen, toggle, width, setWidth, messages, newChat, context, draft],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAI(): AIContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAI must be used within <EnterpriseAIProvider>");
  return ctx;
}

/**
 * AI workspace — state model + placeholder content. This is the ONLY contract the AI panel renders.
 * It is deliberately provider-agnostic: nothing here knows about OpenAI / Claude / Gemini / local
 * LLMs / MCP / workflows. A future AI runtime produces `AIMessage[]` + `AIContextItem[]` in this shape
 * and the entire UI keeps working unchanged. No functionality lives here — placeholders only.
 */
import {
  FileText, Boxes, Building2, UserRound, ReceiptText, Truck, Package, Warehouse, ShoppingCart,
  Sparkles, TrendingUp, AlertTriangle, PackageSearch, Wallet,
  Paperclip, AtSign, Mic, ArrowUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AIMessageRole = "user" | "assistant" | "tool" | "system" | "thinking" | "error";

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  timestamp?: string;
  /** Tool name for `tool` messages. */
  tool?: string;
  /** `thinking` messages render collapsed by default. */
  defaultOpen?: boolean;
}

export interface AIContextItem {
  id: string;
  label: string;
  value: string;
  icon: LucideIcon;
  /** `pinned` items (page/module/workspace/business) are always present; others are selections. */
  pinned?: boolean;
}

export interface AISuggestion {
  id: string;
  label: string;
  icon: LucideIcon;
}

/** A composer affordance (attach / mention / voice / send). Placeholder — no behavior yet. */
export interface AIComposerAction {
  id: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}

// ── Placeholder conversation (one of every role, so the rendering architecture is visible) ─────────
export const SAMPLE_CONVERSATION: AIMessage[] = [
  { id: "m1", role: "user", content: "Which invoices are overdue for COSMY UCO, and what's the total exposure?" },
  { id: "m2", role: "thinking", content: "Checking receivables for COSMY UCO, filtering by due date < today, grouping by ageing bucket…" },
  { id: "m3", role: "tool", tool: "finance.receivables", content: "Queried 142 open invoices · 3 overdue · ₹47,00,000 in the 31–60 day bucket." },
  {
    id: "m4",
    role: "assistant",
    content:
      "You have 3 overdue invoices for COSMY UCO totalling ₹47.0L, all in the 31–60 day bucket. The largest is INV-2026-1187 (₹88,500) from Metro Cash & Carry. Want me to draft reminders?",
  },
  { id: "m5", role: "system", content: "This is placeholder content. AI responses are not connected yet." },
  { id: "m6", role: "error", content: "Example error state — the assistant could not reach the analytics service." },
];

export const SAMPLE_SUGGESTIONS: AISuggestion[] = [
  { id: "s1", label: "Explain this dashboard", icon: Sparkles },
  { id: "s2", label: "Summarize today's sales", icon: TrendingUp },
  { id: "s3", label: "Find overdue invoices", icon: AlertTriangle },
  { id: "s4", label: "Analyze inventory", icon: PackageSearch },
  { id: "s5", label: "Generate purchase order", icon: FileText },
  { id: "s6", label: "Show cash flow", icon: Wallet },
];

/** Selected-entity context placeholders (the AI "knows" these once wired to real selection state). */
export const PLACEHOLDER_SELECTIONS: AIContextItem[] = [
  { id: "c-cust", label: "Customer", value: "Metro Cash & Carry", icon: UserRound },
  { id: "c-inv", label: "Invoice", value: "INV-2026-1187", icon: ReceiptText },
  { id: "c-order", label: "Order", value: "SO-2026-0026", icon: ShoppingCart },
  { id: "c-sup", label: "Supplier", value: "Gulf Packaging", icon: Truck },
  { id: "c-wh", label: "Warehouse", value: "Karachi WH", icon: Warehouse },
];

export const COMPOSER_ACTIONS: AIComposerAction[] = [
  { id: "attach", label: "Attach file", icon: Paperclip },
  { id: "mention", label: "Mention", icon: AtSign },
  { id: "voice", label: "Voice input (coming soon)", icon: Mic, disabled: true },
];

/** Mention targets for the composer @-menu. */
export const MENTION_TARGETS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "page", label: "Page", icon: FileText },
  { id: "record", label: "Record", icon: Boxes },
  { id: "customer", label: "Customer", icon: UserRound },
  { id: "invoice", label: "Invoice", icon: ReceiptText },
  { id: "supplier", label: "Supplier", icon: Truck },
  { id: "product", label: "Product", icon: Package },
];

export const SEND_ICON = ArrowUp;
export const PINNED_ICONS = { page: FileText, module: Boxes, workspace: Building2 } as const;

// ── Resize bounds for the docked panel ─────────────────────────────────────────────────────────────
export const AI_WIDTH_DEFAULT = 384;
export const AI_WIDTH_MIN = 320;
export const AI_WIDTH_MAX = 640;
export const AI_WIDTH_STEP = 24;

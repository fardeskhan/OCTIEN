/**
 * Enterprise Notification platform — model + config. ONE notification system every module publishes
 * into (Sales, Procurement, Inventory, Finance, CRM, Manufacturing, HR, Administration, Security,
 * System, AI, Workflow). Future-proof shape; mock data today, swap the source for a live service
 * tomorrow with zero UI change.
 */
import {
  Info, CheckCircle2, AlertTriangle, XCircle, AlertOctagon,
  ShoppingCart, PackageCheck, Boxes, Banknote, Contact, Factory, Users, ShieldCheck, ShieldAlert, Server, Sparkles, Workflow as WorkflowIcon,
  Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NotificationSeverity = "info" | "success" | "warning" | "error" | "critical";

export type NotificationType =
  | "Sales" | "Procurement" | "Inventory" | "Finance" | "CRM" | "Manufacturing"
  | "HR" | "Administration" | "Security" | "System" | "AI" | "Workflow";

export interface NotificationAction {
  id: string;
  label: string;
  kind?: "default" | "primary" | "destructive";
  href?: string;
  /** Client action; when present, runs instead of navigating. */
  run?: () => void | Promise<void>;
}

/** The notification record — the contract a future service must return. */
export interface AppNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  description?: string;
  timestamp: string; // ISO
  read: boolean;
  icon?: LucideIcon; // optional override; defaults from type
  href?: string;
  module?: string;
  business?: string;
  actor?: string;
  metadata?: Record<string, unknown>;
  actions?: NotificationAction[];
}

/**
 * Severity → token classes: `color` (icon/text), `dot` (status dot), `tint` (icon container bg),
 * `accent` (left rail), `emphasis` (whether it warrants a persistent colored rail), and a11y `label`.
 * All colors come from design tokens only — never hardcoded.
 */
export const severityConfig: Record<
  NotificationSeverity,
  { icon: LucideIcon; color: string; dot: string; tint: string; accent: string; emphasis: boolean; label: string }
> = {
  info: { icon: Info, color: "text-info", dot: "bg-info", tint: "bg-info/10", accent: "bg-info", emphasis: false, label: "Information" },
  success: { icon: CheckCircle2, color: "text-success", dot: "bg-success", tint: "bg-success/10", accent: "bg-success", emphasis: false, label: "Success" },
  warning: { icon: AlertTriangle, color: "text-warning", dot: "bg-warning", tint: "bg-warning/12", accent: "bg-warning", emphasis: true, label: "Warning" },
  error: { icon: XCircle, color: "text-destructive", dot: "bg-destructive", tint: "bg-destructive/10", accent: "bg-destructive", emphasis: true, label: "Error" },
  critical: { icon: AlertOctagon, color: "text-destructive", dot: "bg-destructive", tint: "bg-destructive/12", accent: "bg-destructive", emphasis: true, label: "Critical" },
};

/** Type → default icon (used when a notification doesn't override `icon`). */
export const typeIcon: Record<NotificationType, LucideIcon> = {
  Sales: ShoppingCart,
  Procurement: PackageCheck,
  Inventory: Boxes,
  Finance: Banknote,
  CRM: Contact,
  Manufacturing: Factory,
  HR: Users,
  Administration: ShieldCheck,
  Security: ShieldAlert,
  System: Server,
  AI: Sparkles,
  Workflow: WorkflowIcon,
};

export const NOTIFICATION_TYPES: NotificationType[] = [
  "Sales", "Procurement", "Inventory", "Finance", "CRM", "Manufacturing", "HR", "Administration", "Security", "System", "AI", "Workflow",
];

export const fallbackIcon = Bell;

// ── Grouping + time ─────────────────────────────────────────────────────────────────────────────
export type DayBucket = "Today" | "Yesterday" | "This Week" | "Earlier";
const BUCKET_ORDER: DayBucket[] = ["Today", "Yesterday", "This Week", "Earlier"];

export function bucketFor(ts: string, now = new Date()): DayBucket {
  const d = new Date(ts);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((startOfToday.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return "This Week";
  return "Earlier";
}

/** Group notifications into day buckets, preserving bucket order and recency within. */
export function groupByDay(items: AppNotification[]): { bucket: DayBucket; items: AppNotification[] }[] {
  const map = new Map<DayBucket, AppNotification[]>();
  for (const n of [...items].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))) {
    const b = bucketFor(n.timestamp);
    (map.get(b) ?? map.set(b, []).get(b)!).push(n);
  }
  return BUCKET_ORDER.filter((b) => map.has(b)).map((b) => ({ bucket: b, items: map.get(b)! }));
}

/** Compact relative time ("5m", "2h", "3d", or a date). */
export function relativeTime(ts: string, now = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(ts).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

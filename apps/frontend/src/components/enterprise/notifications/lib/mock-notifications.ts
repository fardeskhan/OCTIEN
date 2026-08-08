/**
 * MOCK notification source. This is the ONLY file that changes when a live service arrives — replace
 * `fetchNotifications` with a call to the real API (same `AppNotification[]` contract) and every
 * component, the provider, grouping, filtering and UI keep working untouched.
 */
import type { AppNotification } from "./notifications";

const minsAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

const SEED: AppNotification[] = [
  {
    id: "n_ap_approval",
    type: "Procurement",
    severity: "warning",
    title: "Purchase order awaiting your approval",
    description: "PO-2026-0431 for Salam Cola — ₹4,20,000 to Gulf Packaging exceeds the ₹3,00,000 auto-approve limit.",
    timestamp: minsAgo(4),
    read: false,
    href: "/procurement",
    module: "Procurement",
    business: "Salam Cola",
    actor: "Adnan (Buyer)",
    actions: [
      { id: "approve", label: "Approve", kind: "primary" },
      { id: "open", label: "Review", href: "/procurement" },
    ],
  },
  {
    id: "n_inv_lowstock",
    type: "Inventory",
    severity: "critical",
    title: "Stock below safety level",
    description: "PET Preform 28mm at Karachi WH is at 1,200 units — below the 5,000 reorder point.",
    timestamp: minsAgo(26),
    read: false,
    href: "/inventory",
    module: "Inventory",
    business: "Salam Cola",
    actions: [
      { id: "open", label: "Create PO", kind: "primary", href: "/procurement" },
      { id: "view", label: "View item", href: "/inventory" },
    ],
  },
  {
    id: "n_sales_paid",
    type: "Sales",
    severity: "success",
    title: "Invoice paid",
    description: "INV-2026-1187 (₹88,500) from Metro Cash & Carry has been settled in full.",
    timestamp: minsAgo(52),
    read: false,
    href: "/sales",
    module: "Sales",
    business: "COSMY UCO",
    actor: "System",
    actions: [{ id: "open", label: "Open invoice", href: "/sales" }],
  },
  {
    id: "n_fin_recon",
    type: "Finance",
    severity: "info",
    title: "Bank reconciliation ready to review",
    description: "August HBL statement imported — 142 transactions, 3 unmatched.",
    timestamp: hoursAgo(3),
    read: true,
    href: "/finance",
    module: "Finance",
    business: "COSMY UCO",
    actions: [{ id: "open", label: "Reconcile", href: "/finance" }],
  },
  {
    id: "n_security_login",
    type: "Security",
    severity: "warning",
    title: "New sign-in from an unrecognized device",
    description: "A session was started from Chrome on Windows in Lahore. If this wasn't you, review active sessions.",
    timestamp: hoursAgo(6),
    read: false,
    module: "Security",
    actor: "owner@cosmy.ai",
    actions: [{ id: "open", label: "Review sessions", href: "/settings" }],
  },
  {
    id: "n_workflow_stuck",
    type: "Workflow",
    severity: "error",
    title: "Approval workflow failed to route",
    description: "Requisition REQ-0092 could not find an approver for the Finance step.",
    timestamp: yesterdayAt(10, 15),
    read: true,
    module: "Workflow",
    business: "Casa de Lumas",
    actions: [
      { id: "retry", label: "Retry", kind: "primary" },
      { id: "open", label: "Inspect", href: "/administration" },
    ],
  },
  {
    id: "n_ai_insight",
    type: "AI",
    severity: "info",
    title: "OCTIEN AI spotted a margin drop",
    description: "COSMY UCO gross margin fell 4.2% week-over-week, driven by higher glycerin cost. Ask AI for a breakdown.",
    timestamp: yesterdayAt(16, 40),
    read: true,
    module: "AI",
    business: "COSMY UCO",
    actions: [{ id: "ask", label: "Ask AI", kind: "primary" }],
  },
  {
    id: "n_hr_leave",
    type: "HR",
    severity: "info",
    title: "Leave request submitted",
    description: "Sana R. requested 3 days of annual leave (Aug 18–20).",
    timestamp: daysAgo(3),
    read: true,
    module: "HR",
    actor: "Sana R.",
    actions: [{ id: "open", label: "Review", href: "/hr" }],
  },
  {
    id: "n_system_maint",
    type: "System",
    severity: "info",
    title: "Scheduled maintenance completed",
    description: "Database migration to PostgreSQL 16 finished successfully with zero downtime.",
    timestamp: daysAgo(5),
    read: true,
    module: "System",
  },
];

function yesterdayAt(h: number, m: number): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

/**
 * The service seam. Simulates latency so loading/skeleton states are exercised. Swap the body for a
 * real fetch — the return contract (`AppNotification[]`) is all the UI depends on.
 */
export async function fetchNotifications(): Promise<AppNotification[]> {
  await new Promise((r) => setTimeout(r, 550));
  return SEED.map((n) => ({ ...n }));
}

/**
 * OCTIEN NAVIGATION — the single authoritative navigation model.
 *
 * Contract: docs/design/NAVIGATION_ARCHITECTURE.md. This is the ONLY place navigation is defined.
 * The sidebar, breadcrumbs, command palette, navigation search, favorites, and recent are ALL
 * generated from this config — never hardcode a nav item, route label, or icon anywhere else.
 *
 * `status: "live"` items link to real, shipped routes. `status: "soon"` items model the full
 * enterprise IA (so the shell scales to 100+ pages and future modules plug in here) but render
 * disabled with a "Soon" badge — they never produce a broken link.
 *
 * Consumed CLIENT-side (icons are React components and can't cross the server→client boundary as
 * props), so this module stays free of server-only imports.
 */
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, LineChart, ShoppingCart, PackageCheck, Boxes, Factory, Truck,
  BookOpen, FileText, Landmark, PiggyBank, Building, Receipt, ArrowLeftRight, CalendarCheck,
  Contact, LifeBuoy, Megaphone, Users, Wallet, CalendarClock,
  GlassWater, Droplet, Box, Building2, ShieldCheck, UserCog, KeyRound, Settings, BarChart3, Clock,
} from "lucide-react";

export type NavStatus = "live" | "soon";

export interface NavItem {
  /** Display label (also indexed for search/palette). */
  label: string;
  /** Route. Omitted/undefined for `soon` items. */
  href?: string;
  icon: LucideIcon;
  /** RBAC permission (`resource.action`); undefined = always visible. Owner/super-admin bypasses. */
  permission?: string;
  /** Availability. Defaults to "live". */
  status?: NavStatus;
  /** Optional badge text/number (e.g. counts, "Soon", "Beta"). */
  badge?: string | number;
  /** Extra search keywords for the command palette / nav search. */
  keywords?: string[];
  /** Active-route matching. "prefix" (default): pathname startsWith href. "exact": pathname === href. */
  match?: "exact" | "prefix";
}

export interface NavGroup {
  /** Section heading (e.g. "Operations"). */
  label: string;
  items: NavItem[];
}

/** The enterprise navigation model — grouped, permission-gated, scale-ready. */
export const navigation: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard, match: "exact", keywords: ["home", "overview", "kpi"] },
      { label: "Reports", href: "/reports", icon: BarChart3, permission: "reporting.read", keywords: ["report", "register", "export"] },
      { label: "Analytics", href: "/analytics", icon: LineChart, status: "soon", keywords: ["insights", "metrics"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Sales", href: "/sales", icon: ShoppingCart, permission: "sales.read", keywords: ["orders", "quotations", "invoices", "customers", "deliveries"] },
      { label: "Procurement", href: "/procurement", icon: PackageCheck, permission: "procurement.read", keywords: ["purchase", "suppliers", "vendors", "bills", "goods receipt", "po"] },
      { label: "Inventory", href: "/inventory", icon: Boxes, permission: "inventory.read", keywords: ["stock", "warehouse", "valuation", "movements", "ledger"] },
      { label: "Manufacturing", href: "/manufacturing", icon: Factory, status: "soon", keywords: ["production", "bom", "work order"] },
      { label: "Logistics", href: "/operations/logistics", icon: Truck, permission: "logistics.read", keywords: ["delivery", "fleet", "routes", "shipments"] },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Accounting", href: "/finance/accounting", icon: BookOpen, permission: "finance.read", keywords: ["journals", "ledger", "trial balance", "gl"] },
      { label: "Statements", href: "/finance/statements", icon: FileText, permission: "finance.read", keywords: ["p&l", "profit and loss", "balance sheet", "cash flow"] },
      { label: "Receivables", href: "/finance/receivables", icon: ArrowLeftRight, permission: "finance.read", keywords: ["ar", "aging", "collections"] },
      { label: "Payables", href: "/finance/payables", icon: ArrowLeftRight, permission: "finance.read", keywords: ["ap", "aging", "vendors"] },
      { label: "Banking", href: "/finance/treasury", icon: Landmark, permission: "finance.read", keywords: ["bank", "treasury", "reconciliation", "cash"] },
      { label: "Assets", href: "/finance/assets", icon: Building, permission: "finance.read", keywords: ["fixed assets", "depreciation"] },
      { label: "Period Close", href: "/finance/close", icon: CalendarCheck, permission: "finance.read", keywords: ["close", "period", "checklist"] },
      { label: "Budgets", href: "/finance/budgets", icon: PiggyBank, status: "soon", keywords: ["budget", "variance", "forecast"] },
      { label: "Taxes", href: "/finance/taxes", icon: Receipt, status: "soon", keywords: ["gst", "vat", "tax", "gstr"] },
    ],
  },
  {
    label: "Customer",
    items: [
      { label: "CRM", href: "/crm", icon: Contact, status: "soon", keywords: ["leads", "contacts", "pipeline", "deals"] },
      { label: "Support", href: "/support", icon: LifeBuoy, status: "soon", keywords: ["tickets", "helpdesk"] },
      { label: "Marketing", href: "/marketing", icon: Megaphone, status: "soon", keywords: ["campaigns", "email"] },
    ],
  },
  {
    label: "People",
    items: [
      { label: "HR", href: "/hr", icon: Users, status: "soon", keywords: ["employees", "people"] },
      { label: "Payroll", href: "/hr/payroll", icon: Wallet, status: "soon", keywords: ["salary", "wages"] },
      { label: "Attendance", href: "/hr/attendance", icon: CalendarClock, status: "soon", keywords: ["leave", "time"] },
    ],
  },
  {
    label: "Business Units",
    items: [
      { label: "Salam Cola", href: "/salam-cola", icon: GlassWater, permission: "salam.read", keywords: ["beverage", "cola"] },
      { label: "UCO Collections", href: "/uco", icon: Droplet, permission: "uco.read", keywords: ["used cooking oil", "collection"] },
      { label: "Casa de Lumas", href: "/lumas", icon: Box, permission: "lumas.read", keywords: ["lumas"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Businesses", href: "/business", icon: Building2, keywords: ["tenants", "companies", "org"] },
      { label: "Governance", href: "/governance", icon: ShieldCheck, permission: "governance.read", keywords: ["audit", "compliance", "logs"] },
      { label: "Users & Roles", href: "/admin/users", icon: UserCog, status: "soon", keywords: ["users", "roles", "team"] },
      { label: "Permissions", href: "/admin/permissions", icon: KeyRound, status: "soon", keywords: ["rbac", "access"] },
      { label: "Settings", href: "/settings", icon: Settings, status: "soon", keywords: ["preferences", "config"] },
    ],
  },
];

// ── Helpers (the ONLY navigation logic — consumed by sidebar, breadcrumbs, palette, search) ─────

/** True if the user (with `permissions`) may see this item. Owner/super-admin passes via "*". */
export function canSee(item: NavItem, permissions: string[]): boolean {
  if (!item.permission) return true;
  return permissions.includes(item.permission) || permissions.includes("*");
}

/** Filter the whole model by permissions; optionally drop `soon` items. Empty groups are removed. */
export function getVisibleNavigation(permissions: string[], opts?: { includeSoon?: boolean }): NavGroup[] {
  const includeSoon = opts?.includeSoon ?? true;
  return navigation
    .map((group) => ({
      label: group.label,
      items: group.items.filter((it) => canSee(it, permissions) && (includeSoon || (it.status ?? "live") === "live")),
    }))
    .filter((group) => group.items.length > 0);
}

/** Is this item the active route for `pathname`? */
export function isActive(item: NavItem, pathname: string): boolean {
  if (!item.href) return false;
  if (item.match === "exact") return pathname === item.href;
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

/** Flattened, live, permitted items — the index for command palette + navigation search. */
export function flattenNavigation(permissions: string[]): (NavItem & { group: string })[] {
  const out: (NavItem & { group: string })[] = [];
  for (const group of navigation) {
    for (const it of group.items) {
      if ((it.status ?? "live") === "live" && it.href && canSee(it, permissions)) {
        out.push({ ...it, group: group.label });
      }
    }
  }
  return out;
}

/** Find the group + item that owns a pathname (deepest live match). */
export function findNavMatch(pathname: string): { group: NavGroup; item: NavItem } | null {
  let best: { group: NavGroup; item: NavItem; len: number } | null = null;
  for (const group of navigation) {
    for (const item of group.items) {
      if (item.href && isActive(item, pathname)) {
        const len = item.href.length;
        if (!best || len > best.len) best = { group, item, len };
      }
    }
  }
  return best ? { group: best.group, item: best.item } : null;
}

/** Look up a nav item by exact href (used by Favorites, which store nav hrefs). */
export function getItemByHref(href: string): NavItem | null {
  for (const group of navigation) {
    for (const item of group.items) if (item.href === href) return item;
  }
  return null;
}

/**
 * Describe an arbitrary visited route (used by Recent, which stores real pathnames that may be
 * deeper than a nav href) → a renderable `{ label, href, icon }`. Uses the owning nav item's icon
 * and a breadcrumb-derived label.
 */
export function describeRoute(pathname: string): NavItem {
  const match = findNavMatch(pathname);
  const crumbs = getBreadcrumbs(pathname);
  const label = crumbs.length ? crumbs[crumbs.length - 1].label : (match?.item.label ?? pathname);
  return { label, href: pathname, icon: match?.item.icon ?? Clock, status: "live" };
}

export interface Crumb {
  label: string;
  href?: string;
}

/** Prettify a raw path segment ("purchase-orders" → "Purchase Orders"; ids → shortened). */
function prettifySegment(seg: string): string {
  if (/^[0-9a-f]{16,}$/i.test(seg) || /^c[a-z0-9]{20,}$/i.test(seg)) return seg.slice(0, 8) + "…"; // cuid/hash
  return seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Breadcrumbs derived from the nav model + the URL. Produces:
 *   Home > <Group> > <Nav item> > <deeper segments…>
 * The nav item is linked; the group is a non-link label; deeper dynamic segments are prettified.
 */
export function getBreadcrumbs(pathname: string): Crumb[] {
  const crumbs: Crumb[] = [{ label: "Home", href: "/" }];
  if (pathname === "/" || pathname === "") return crumbs;

  const match = findNavMatch(pathname);
  if (match) {
    crumbs.push({ label: match.group.label });
    crumbs.push({ label: match.item.label, href: match.item.href });
    // Append any path segments deeper than the matched nav href.
    const base = (match.item.href ?? "").replace(/\/$/, "");
    const rest = pathname.slice(base.length).split("/").filter(Boolean);
    let acc = base;
    for (const seg of rest) {
      acc += "/" + seg;
      crumbs.push({ label: prettifySegment(seg), href: acc });
    }
  } else {
    // Unknown route — build from raw segments.
    let acc = "";
    for (const seg of pathname.split("/").filter(Boolean)) {
      acc += "/" + seg;
      crumbs.push({ label: prettifySegment(seg), href: acc });
    }
  }
  // The last crumb is the current page — drop its href so it renders as plain text.
  if (crumbs.length > 1) crumbs[crumbs.length - 1] = { label: crumbs[crumbs.length - 1].label };
  return crumbs;
}

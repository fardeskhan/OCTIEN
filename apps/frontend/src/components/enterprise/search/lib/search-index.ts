/**
 * Static search sources + config. Navigation and calculator are pure (no runtime deps) and live
 * here; runtime-dependent sources (theme/business/recent/favorites and the quick-action `run`
 * closures) are assembled in `EnterpriseSearchProvider`. Quick actions are CONFIG — permission-aware.
 */
import { UserPlus, FileText, PackageCheck, Package, BookOpen, ClipboardList, Calculator } from "lucide-react";
import { flattenNavigation } from "@/lib/navigation";
import { fuzzyBest } from "./fuzzy-search";
import { tryCalculate, type SearchSource, type SearchItem } from "./search";

/** Navigation as a search source — decoupled plugin over the single nav model. */
export function navigationSource(): SearchSource {
  return ({ query, permissions }) => {
    const items = flattenNavigation(permissions);
    const out: SearchItem[] = [];
    for (const it of items) {
      if (!it.href) continue;
      const score = query ? fuzzyBest(query, [it.label, it.group, ...(it.keywords ?? [])]) : 60;
      if (score <= 0) continue;
      out.push({
        id: `nav:${it.href}`,
        type: "navigation",
        title: it.label,
        subtitle: it.group,
        icon: it.icon,
        group: "Navigation",
        keywords: it.keywords,
        href: it.href,
        score,
      });
    }
    return out;
  };
}

/** Calculator source — evaluates arithmetic in the query; ranks to the very top when it matches. */
export function calculatorSource(): SearchSource {
  return ({ query }) => {
    const result = tryCalculate(query);
    if (result == null) return [];
    return [
      {
        id: "calc",
        type: "calculator",
        title: result,
        subtitle: `${query.trim()} =`,
        icon: Calculator,
        group: "Calculator",
        hint: "copy",
        score: 100000,
        run: () => {
          try {
            navigator.clipboard?.writeText(result);
          } catch {
            /* ignore */
          }
        },
      },
    ];
  };
}

/** Config-driven quick actions (Create …). Permission-aware, also surfaced in the palette. */
export interface QuickAction {
  id: string;
  title: string;
  href: string;
  icon: typeof UserPlus;
  permission?: string;
  /** Module grouping for the ＋New menu. */
  group: string;
  keywords?: string[];
}

export const quickActions: QuickAction[] = [
  { id: "new-quotation", title: "Quotation", href: "/sales/quotations/new", icon: FileText, permission: "sales.write", group: "Sales", keywords: ["quote", "create"] },
  { id: "new-invoice", title: "Invoice", href: "/sales/invoices/new", icon: FileText, permission: "sales.write", group: "Sales", keywords: ["bill", "create"] },
  { id: "new-customer", title: "Customer", href: "/sales/customers/new", icon: UserPlus, permission: "sales.write", group: "Sales", keywords: ["client", "create"] },
  { id: "new-purchase-order", title: "Purchase Order", href: "/procurement/purchase-orders/new", icon: PackageCheck, permission: "procurement.write", group: "Procurement", keywords: ["po", "create"] },
  { id: "new-requisition", title: "Requisition", href: "/procurement/requisitions/new", icon: ClipboardList, permission: "purchase_requisition.create", group: "Procurement", keywords: ["pr", "create"] },
  { id: "new-supplier", title: "Supplier", href: "/procurement/suppliers/new", icon: PackageCheck, permission: "procurement.write", group: "Procurement", keywords: ["vendor", "create"] },
  { id: "new-product", title: "Product", href: "/inventory/products/new", icon: Package, permission: "inventory.write", group: "Inventory", keywords: ["item", "sku", "create"] },
  { id: "new-journal", title: "Journal Entry", href: "/finance/accounting/journals/new", icon: BookOpen, permission: "finance.write", group: "Finance", keywords: ["gl", "posting", "create"] },
];

/** Distinct module groups present in the (permitted) quick actions, in a stable order. */
export function quickActionGroups(permissions: string[]): { group: string; actions: QuickAction[] }[] {
  const order = ["Sales", "Procurement", "Inventory", "Finance"];
  const permitted = permittedQuickActions(permissions);
  return order
    .map((g) => ({ group: g, actions: permitted.filter((a) => a.group === g) }))
    .filter((s) => s.actions.length > 0);
}

/** Filter quick actions by permission. */
export function permittedQuickActions(permissions: string[]): QuickAction[] {
  return quickActions.filter((a) => !a.permission || permissions.includes(a.permission) || permissions.includes("*"));
}

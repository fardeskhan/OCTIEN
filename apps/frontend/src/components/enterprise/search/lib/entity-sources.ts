/**
 * Entity search sources for the Enterprise Global Search surface. Each is an async-capable
 * `SearchSource` that TODAY returns sample (mock) data, but is shaped so going live means swapping the
 * body for a real read query (server action / read-model) — the UI, ranking, grouping, and result
 * shape never change. To wire live data: replace `data` with `await searchCustomers(query)` etc.
 *
 * NOTE: sample entities are clearly placeholder and only appear while searching. No backend, service,
 * or DB is touched here — this is presentation architecture only.
 */
import { Users, Package, ShoppingCart, Truck, Warehouse, ReceiptText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fuzzyBest } from "./fuzzy-search";
import type { SearchSource, SearchItem, SearchItemType } from "./search";

interface MockEntity {
  id: string;
  name: string;
  meta?: string;
}

/** Factory: builds an entity source over a dataset. Swap `data` for a live query to go live. */
function makeEntitySource(opts: {
  type: SearchItemType;
  group: string;
  icon: LucideIcon;
  hrefBase: string;
  permission?: string;
  data: MockEntity[];
  /** live query hook — when provided, used instead of the static dataset. */
  query?: (q: string) => Promise<MockEntity[]>;
}): SearchSource {
  return async ({ query: q, permissions }) => {
    if (!q.trim()) return []; // entities appear only when actively searching
    if (opts.permission && !permissions.includes(opts.permission) && !permissions.includes("*")) return [];
    const rows = opts.query ? await opts.query(q) : opts.data;
    const out: SearchItem[] = [];
    for (const e of rows) {
      const score = opts.query ? 80 : fuzzyBest(q, [e.name, e.meta]);
      if (score <= 0) continue;
      out.push({
        id: `${opts.type}:${e.id}`,
        type: opts.type,
        title: e.name,
        subtitle: e.meta,
        icon: opts.icon,
        group: opts.group,
        href: `${opts.hrefBase}/${e.id}`,
        score,
      });
    }
    return out.slice(0, 6);
  };
}

// ── Sample datasets (placeholder — replace with live read queries) ─────────────────────────────
const CUSTOMERS: MockEntity[] = [
  { id: "sample-1", name: "Ahmedabad Distributors", meta: "Customer · Gujarat" },
  { id: "sample-2", name: "Mumbai Retail Group", meta: "Customer · Maharashtra" },
  { id: "sample-3", name: "Delhi Wholesale Co.", meta: "Customer · Delhi" },
];
const SUPPLIERS: MockEntity[] = [
  { id: "sample-1", name: "Ahmedabad Packaging", meta: "Supplier" },
  { id: "sample-2", name: "Pune Ingredients Ltd", meta: "Supplier" },
];
const PRODUCTS: MockEntity[] = [
  { id: "sample-1", name: "Salam Cola 250ml", meta: "Product · CASE" },
  { id: "sample-2", name: "Salam Cola 500ml", meta: "Product · CASE" },
  { id: "sample-3", name: "Salam Orange 250ml", meta: "Product · CASE" },
];
const ORDERS: MockEntity[] = [
  { id: "sample-1", name: "SO-2026-00127", meta: "Sales Order · Confirmed" },
  { id: "sample-2", name: "SO-2026-00126", meta: "Sales Order · Fulfilled" },
];
const INVOICES: MockEntity[] = [
  { id: "sample-1", name: "INV-2026-0042", meta: "Invoice · Unpaid" },
  { id: "sample-2", name: "INV-2026-0041", meta: "Invoice · Paid" },
];
const WAREHOUSES: MockEntity[] = [
  { id: "sample-1", name: "Main Warehouse", meta: "Warehouse" },
  { id: "sample-2", name: "Distributor Dispatch", meta: "Warehouse" },
];

/** All entity sources. Ordered for the global-search results panel. */
export function entitySources(): SearchSource[] {
  return [
    makeEntitySource({ type: "customer", group: "Customers", icon: Users, hrefBase: "/sales/customers", permission: "sales.read", data: CUSTOMERS }),
    makeEntitySource({ type: "supplier", group: "Suppliers", icon: Truck, hrefBase: "/procurement/suppliers", permission: "procurement.read", data: SUPPLIERS }),
    makeEntitySource({ type: "product", group: "Products", icon: Package, hrefBase: "/inventory/products", permission: "inventory.read", data: PRODUCTS }),
    makeEntitySource({ type: "order", group: "Sales Orders", icon: ShoppingCart, hrefBase: "/sales/orders", permission: "sales.read", data: ORDERS }),
    makeEntitySource({ type: "invoice", group: "Invoices", icon: ReceiptText, hrefBase: "/sales/invoices", permission: "sales.read", data: INVOICES }),
    makeEntitySource({ type: "warehouse", group: "Warehouses", icon: Warehouse, hrefBase: "/inventory/warehouses", permission: "inventory.read", data: WAREHOUSES }),
  ];
}

/** Result-type → display label + accent (for filter chips + badges). */
export const ENTITY_GROUP_ORDER = ["Calculator", "Customers", "Suppliers", "Products", "Sales Orders", "Invoices", "Warehouses", "Reports", "Navigation", "Recent"];

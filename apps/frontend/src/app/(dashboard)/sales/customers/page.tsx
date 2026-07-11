export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { CustomersList, type CustomerRow } from "./customers-list";
import type { Customer } from "@/types";

const STATUS_MAP: Record<string, NonNullable<Customer["status"]>> = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  INACTIVE: "Inactive",
};
const HEALTH_MAP: Record<string, number> = { GOOD: 92, HOLD: 58, BLOCKED: 30 };

export default async function CustomersPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");

  const customers = await db.customer.findMany({
    where: { businessId, deletedAt: null },
    include: {
      customerInvoices: { where: { deletedAt: null }, select: { remainingAmount: true, createdAt: true } },
      salesOrders: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const data: CustomerRow[] = customers.map((c) => {
    const outstanding = c.customerInvoices.reduce((s, inv) => s + inv.remainingAmount.toNumber(), 0);
    const openInvoices = c.customerInvoices.filter((inv) => inv.remainingAmount.toNumber() > 0).length;
    const lastOrder = c.salesOrders[0]?.createdAt ?? c.customerInvoices[0]?.createdAt ?? null;
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      status: STATUS_MAP[c.status] ?? "Active",
      creditStatus: c.creditStatus,
      healthScore: HEALTH_MAP[c.creditStatus] ?? 70,
      outstandingBalance: Math.round(outstanding),
      openInvoices,
      lastOrderDate: lastOrder ? lastOrder.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "",
    };
  });

  return <CustomersList data={data} />;
}

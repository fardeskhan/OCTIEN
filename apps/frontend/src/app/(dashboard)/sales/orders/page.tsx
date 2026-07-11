export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { SalesOrdersTable } from "./orders-table";
import type { SalesOrder } from "@/types";

const STATUS_MAP: Record<string, SalesOrder["status"]> = {
  DRAFT: "Draft",
  APPROVED: "Confirmed",
  CONFIRMED: "Confirmed",
  PARTIALLY_FULFILLED: "Processing",
  FULFILLED: "Delivered",
  CANCELLED: "Cancelled",
};

export default async function SalesOrdersPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");

  const orders = await db.salesOrder.findMany({
    where: { businessId },
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const data: SalesOrder[] = orders.map((so): SalesOrder => ({
    id: so.code,
    date: so.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    customer: so.customer.name,
    status: STATUS_MAP[so.status] ?? "Draft",
    total: so.totalAmount,
  }));

  return <SalesOrdersTable data={data} />;
}

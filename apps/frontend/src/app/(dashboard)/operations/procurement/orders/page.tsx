export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { PurchaseOrdersTable } from "./orders-table";
import type { PurchaseOrder } from "@/types";

const STATUS_MAP: Record<string, PurchaseOrder["status"]> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  ORDERED: "Sent",
  PARTIALLY_RECEIVED: "Partial",
  RECEIVED: "Received",
  CLOSED: "Received",
  CANCELLED: "Cancelled",
};

export default async function PurchaseOrdersPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("procurement.read");

  const orders = await db.purchaseOrder.findMany({
    where: { businessId },
    include: { supplier: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const data: PurchaseOrder[] = orders.map((po): PurchaseOrder => ({
    id: po.code,
    date: (po.orderedAt ?? po.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    supplier: po.supplier.name,
    status: STATUS_MAP[po.status] ?? "Draft",
    total: po.totalAmount,
  }));

  return <PurchaseOrdersTable data={data} />;
}

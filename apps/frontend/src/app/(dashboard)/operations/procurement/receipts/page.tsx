export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { GoodsReceiptsTable } from "./receipts-table";
import type { Receipt } from "@/types";

const STATUS_MAP: Record<string, Receipt["status"]> = {
  REQUESTED: "Pending",
  PROCESSING: "Pending",
  COMPLETED: "Completed",
  REJECTED: "Discrepancy",
};

export default async function GoodsReceiptsPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("procurement.read");

  const receipts = await db.goodsReceiptRequest.findMany({
    where: { businessId },
    include: {
      purchaseOrder: { select: { code: true, supplier: { select: { name: true } } } },
      _count: { select: { lines: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const data: Receipt[] = receipts.map((grn): Receipt => ({
    id: grn.code,
    date: (grn.receivedAt ?? grn.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    poNumber: grn.purchaseOrder.code,
    supplier: grn.purchaseOrder.supplier.name,
    status: STATUS_MAP[grn.status] ?? "Pending",
    items: grn._count.lines,
  }));

  return <GoodsReceiptsTable data={data} />;
}

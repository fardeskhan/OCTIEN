export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { SuppliersList, type SupplierRow } from "./suppliers-list";

const STATUS_MAP: Record<string, SupplierRow["status"]> = {
  ACTIVE: "Active",
  PROSPECT: "Pending Review",
  UNDER_REVIEW: "Pending Review",
  SUSPENDED: "Probation",
  TERMINATED: "Inactive",
};
const OPEN_PO_STATUSES = new Set(["DRAFT", "APPROVED", "ORDERED", "PARTIALLY_RECEIVED"]);

export default async function SuppliersPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("procurement.read");

  const suppliers = await db.supplier.findMany({
    where: { businessId, deletedAt: null },
    include: { purchaseOrders: { select: { status: true } } },
    orderBy: { createdAt: "desc" },
  });

  const data: SupplierRow[] = suppliers.map((s): SupplierRow => ({
    id: s.id,
    code: s.code,
    name: s.name,
    status: STATUS_MAP[s.status] ?? "Pending Review",
    riskLevel: s.riskLevel,
    paymentTerms: s.paymentTerms ?? "",
    activeOrders: s.purchaseOrders.filter((po) => OPEN_PO_STATUSES.has(po.status)).length,
  }));

  return <SuppliersList data={data} />;
}

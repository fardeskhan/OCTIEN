export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { EWayBillClient, type EWayRow, type InvoiceOpt } from "./ewb-client";

export default async function EWayBillsPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("logistics.read");

  const bills = await db.eWayBill.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const invoiceIds = bills.map((b) => b.invoiceId);
  const invoices = await db.customerInvoice.findMany({
    where: { businessId, deletedAt: null },
    select: { id: true, code: true },
    orderBy: { code: "asc" },
  });
  const invById = new Map(invoices.map((i) => [i.id, i.code]));

  const rows: EWayRow[] = bills.map((b) => ({
    id: b.id,
    ewbNumber: b.ewbNumber,
    invoiceCode: invById.get(b.invoiceId) ?? "—",
    status: b.status,
    validFrom: b.validFrom ? b.validFrom.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null,
    validUntil: b.validUntil ? b.validUntil.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null,
    vehicleNumber: b.vehicleNumber,
    transporterName: b.transporterName,
    createdAt: b.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
  }));

  // Invoices without an E-Way bill yet — candidates to create one.
  const withEwb = new Set(invoiceIds);
  const candidates: InvoiceOpt[] = invoices.filter((i) => !withEwb.has(i.id)).map((i) => ({ id: i.id, code: i.code }));

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="E-Way Bills" description="Generate and track E-Way bills. Provider: mock (NIC/GSP swaps in without code changes)." />
      <EWayBillClient rows={rows} candidates={candidates} />
    </WorkspaceLayout>
  );
}

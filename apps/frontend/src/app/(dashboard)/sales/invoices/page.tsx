export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { InvoicesTable, type InvoiceRow } from "./invoices-table";
import type { Invoice } from "@/types";

const STATUS_MAP: Record<string, Invoice["status"]> = {
  DRAFT: "Draft",
  ISSUED: "Sent",
  PARTIALLY_PAID: "Sent",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export default async function InvoicesPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("sales.read");

  const invoices = await db.customerInvoice.findMany({
    where: { businessId, deletedAt: null },
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const data: InvoiceRow[] = invoices.map((inv): InvoiceRow => ({
    id: inv.id,
    number: inv.code,
    date: fmt(inv.createdAt),
    dueDate: fmt(inv.createdAt),
    customer: inv.customer.name,
    status: STATUS_MAP[inv.status] ?? "Sent",
    total: inv.totalAmount.toNumber(),
    balance: inv.remainingAmount.toNumber(),
  }));

  return <InvoicesTable data={data} />;
}

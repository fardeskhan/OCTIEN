"use server";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { processOutboxBatch } from "@/lib/outbox";

export async function approveSupplierBill(billId: string) {
  const { currentBusinessId: businessId, tenantId } = await requireBusinessContext();
  await requirePermission("finance.write");

  return db.$transaction(async (tx) => {
    const bill = await tx.supplierBill.findUnique({
      where: { id: billId, businessId },
      include: { lines: true },
    });

    if (!bill) throw new Error("Bill not found");
    if (bill.status !== "DRAFT") throw new Error("Only draft bills can be approved");

    // NOTE: 3-way match (supplier bill amount vs accepted GRN value vs PO price/tax) is intentionally
    // NOT enforced here yet — it needs the authoritative pricing/tax model established first. Tracked
    // as a separate evidence-driven task; do not add an invented tolerance.

    const updatedBill = await tx.supplierBill.update({
      where: { id: billId },
      data: { status: "APPROVED" },
    });

    await tx.outboxEventRecord.create({
      data: {
        eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        eventType: "SupplierBillApproved",
        aggregateId: billId,
        aggregateVersion: 1,
        businessId,
        tenantId,
        occurredAt: new Date(),
        payload: { billId: bill.id, amount: bill.totalAmount },
        status: "PENDING",
      },
    });

    return updatedBill;
  }).finally(() => {
    processOutboxBatch().catch(console.error);
  });
}

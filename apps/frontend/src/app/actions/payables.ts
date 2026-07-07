// @ts-nocheck
"use server";

import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/rbac";
import { processOutboxBatch } from "@/lib/outbox";
import { Prisma, PaymentMethod } from "@prisma/client";

export async function registerSupplierPayment(data: { amount: number; currencyId: string; method: PaymentMethod; reference?: string; allocations: { payableEntryId: string; amount: number }[] }) {
  const { businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission(userId, tenantId, "finance.write");

  return db.$transaction(async (tx) => {
    // Validate total amount matches allocations
    const totalAllocated = data.allocations.reduce((sum, a) => sum + a.amount, 0);
    if (Math.abs(data.amount - totalAllocated) > 0.01) {
        throw new Error("Payment amount must equal total allocated amount");
    }

    // 1. Create Payment
    const payment = await tx.supplierPayment.create({
      data: {
        businessId,
        amount: new Prisma.Decimal(data.amount),
        currencyId: data.currencyId,
        method: data.method,
        reference: data.reference,
        createdBy: userId,
        allocations: {
            create: data.allocations.map(a => ({
                businessId,
                payableEntryId: a.payableEntryId,
                amount: new Prisma.Decimal(a.amount)
            }))
        }
      },
      include: { allocations: true }
    });

    // 2. Process Allocations
    for (const alloc of data.allocations) {
        const payable = await tx.payableEntry.findUnique({ where: { id: alloc.payableEntryId } });
        if (!payable) throw new Error(`Payable ${alloc.payableEntryId} not found`);

        const remaining = payable.amount.toNumber() - payable.paidAmount.toNumber();
        if (alloc.amount > remaining) {
            throw new Error(`Allocation ${alloc.amount} exceeds remaining payable ${remaining}`);
        }

        const newPaidAmount = payable.paidAmount.toNumber() + alloc.amount;
        const newRemaining = payable.amount.toNumber() - newPaidAmount;
        const newStatus = newRemaining <= 0 ? "PAID" : "PARTIAL";

        await tx.payableEntry.update({
            where: { id: payable.id },
            data: {
                paidAmount: new Prisma.Decimal(newPaidAmount),
                status: newStatus
            }
        });

        // Also update the associated SupplierBill if it exists (legacy sync)
        if (payable.sourceType === "SUPPLIER_BILL") {
            const bill = await tx.supplierBill.findUnique({ where: { id: payable.sourceId } });
            if (bill) {
                const billNewPaid = bill.paidAmount.toNumber() + alloc.amount;
                const billNewRemaining = bill.amount ? bill.amount.toNumber() - billNewPaid : bill.totalAmount.toNumber() - billNewPaid;
                const billNewStatus = billNewRemaining <= 0 ? "PAID" : "PARTIALLY_PAID";
                await tx.supplierBill.update({
                    where: { id: bill.id },
                    data: {
                        paidAmount: new Prisma.Decimal(billNewPaid),
                        remainingAmount: new Prisma.Decimal(billNewRemaining),
                        status: billNewStatus
                    }
                });
            }
        }
    }

    // 3. Record Cash Transaction
    await tx.cashTransaction.create({
      data: {
        businessId,
        type: "CASH_OUT",
        amount: new Prisma.Decimal(data.amount),
        currencyId: data.currencyId,
        reference: payment.id,
        description: `Supplier Payment (Method: ${data.method})`,
        sourceType: "MANUAL",
        sourceId: payment.id,
        createdBy: userId,
      }
    });

    // 4. Emit Events
    await tx.outboxEventRecord.create({
      data: {
        eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        eventType: "SupplierPaymentRegistered",
        aggregateId: payment.id,
        aggregateVersion: 1,
        businessId,
        tenantId,
        occurredAt: new Date(),
        payload: { paymentId: payment.id, amount: data.amount, allocations: data.allocations },
        status: "PENDING"
      }
    });

    return payment;
  }).finally(() => {
    processOutboxBatch().catch(console.error);
  });
}

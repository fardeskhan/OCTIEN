"use server";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { processOutboxBatch } from "@/lib/outbox";
import { Prisma } from "@prisma/client";

export async function recordCustomerPayment(invoiceId: string, amount: number, reference?: string) {
  const { currentBusinessId: businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission("finance.write");

  return db.$transaction(async (tx) => {
    const invoice = await tx.customerInvoice.findUnique({
      where: { id: invoiceId, businessId }
    });

    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
      throw new Error("Cannot pay an invoice that is already paid or cancelled");
    }

    const remaining = invoice.remainingAmount.toNumber();
    if (amount > remaining) {
      throw new Error(`Overpayment rejected. Maximum allowed payment is ${remaining}.`);
    }

    const newPaidAmount = invoice.paidAmount.toNumber() + amount;
    const newRemaining = remaining - amount;
    const newStatus = newRemaining <= 0 ? "PAID" : "PARTIALLY_PAID";

    // 1. Record Payment
    const payment = await tx.customerPayment.create({
      data: {
        businessId,
        invoiceId,
        amount: new Prisma.Decimal(amount),
        currencyId: invoice.currencyId,
        reference,
        createdBy: userId,
      }
    });

    // 2. Update Invoice
    await tx.customerInvoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: new Prisma.Decimal(newPaidAmount),
        remainingAmount: new Prisma.Decimal(newRemaining),
        status: newStatus
      }
    });

    // 3. Record Cash Transaction
    await tx.cashTransaction.create({
      data: {
        businessId,
        type: "CASH_IN",
        amount: new Prisma.Decimal(amount),
        currencyId: invoice.currencyId,
        reference: payment.id,
        description: `Payment for Invoice ${invoice.code}`,
        sourceType: "MANUAL",
        sourceId: invoiceId,
        createdBy: userId,
      }
    });

    // 4. Emit Events
    await tx.outboxEventRecord.create({
      data: {
        eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        eventType: "CustomerPaymentRecorded",
        aggregateId: invoiceId,
        aggregateVersion: 1,
        businessId,
        tenantId,
        occurredAt: new Date(),
        payload: { paymentId: payment.id, invoiceId, amount },
        status: "PENDING"
      }
    });

    if (newStatus === "PAID") {
      await tx.outboxEventRecord.create({
        data: {
          eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          eventType: "CustomerInvoicePaid",
          aggregateId: invoiceId,
          aggregateVersion: 1,
          businessId,
          tenantId,
          occurredAt: new Date(),
          payload: { invoiceId },
          status: "PENDING"
        }
      });
    }

    return payment;
  }).finally(() => {
    processOutboxBatch().catch(console.error);
  });
}

export async function recordSupplierPayment(billId: string, amount: number, reference?: string) {
  const { currentBusinessId: businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission("finance.write");

  return db.$transaction(async (tx) => {
    const bill = await tx.supplierBill.findUnique({
      where: { id: billId, businessId }
    });

    if (!bill) throw new Error("Bill not found");
    if (bill.status === "PAID" || bill.status === "CANCELLED") {
      throw new Error("Cannot pay a bill that is already paid or cancelled");
    }

    const remaining = bill.remainingAmount.toNumber();
    if (amount > remaining) {
      throw new Error(`Overpayment rejected. Maximum allowed payment is ${remaining}.`);
    }

    const newPaidAmount = bill.paidAmount.toNumber() + amount;
    const newRemaining = remaining - amount;
    const newStatus = newRemaining <= 0 ? "PAID" : "PARTIALLY_PAID";

    // 1. Record Payment
    const payment = await tx.supplierPayment.create({
      data: {
        businessId,
        billId,
        amount: new Prisma.Decimal(amount),
        currencyId: bill.currencyId,
        reference,
        createdBy: userId,
      }
    });

    // 2. Update Bill
    await tx.supplierBill.update({
      where: { id: billId },
      data: {
        paidAmount: new Prisma.Decimal(newPaidAmount),
        remainingAmount: new Prisma.Decimal(newRemaining),
        status: newStatus
      }
    });

    // 3. Record Cash Transaction
    await tx.cashTransaction.create({
      data: {
        businessId,
        type: "CASH_OUT",
        amount: new Prisma.Decimal(amount),
        currencyId: bill.currencyId,
        reference: payment.id,
        description: `Payment for Bill ${bill.code}`,
        sourceType: "MANUAL",
        sourceId: billId,
        createdBy: userId,
      }
    });

    // 4. Emit Events
    await tx.outboxEventRecord.create({
      data: {
        eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        eventType: "SupplierPaymentRecorded",
        aggregateId: billId,
        aggregateVersion: 1,
        businessId,
        tenantId,
        occurredAt: new Date(),
        payload: { paymentId: payment.id, billId, amount },
        status: "PENDING"
      }
    });

    if (newStatus === "PAID") {
      await tx.outboxEventRecord.create({
        data: {
          eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          eventType: "SupplierBillPaid",
          aggregateId: billId,
          aggregateVersion: 1,
          businessId,
          tenantId,
          occurredAt: new Date(),
          payload: { billId },
          status: "PENDING"
        }
      });
    }

    return payment;
  }).finally(() => {
    processOutboxBatch().catch(console.error);
  });
}

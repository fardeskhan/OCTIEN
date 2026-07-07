import { db } from "@/lib/db";
import { PaymentMethod, ReceivableStatus, InvoiceStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export class CustomerPaymentService {
  /**
   * Records a new payment received from a customer, leaving the amount unallocated.
   */
  static async receivePayment(data: {
    businessId: string;
    customerId: string;
    amount: number;
    currencyId: string;
    paymentDate: Date;
    method?: PaymentMethod;
    reference?: string;
    createdBy?: string;
  }) {
    return await db.customerPayment.create({
      data: {
        businessId: data.businessId,
        customerId: data.customerId,
        amount: data.amount,
        unallocatedAmount: data.amount,
        currencyId: data.currencyId,
        paymentDate: data.paymentDate,
        method: data.method,
        reference: data.reference,
        createdBy: data.createdBy,
      }
    });
  }

  /**
   * Allocates an unallocated portion of a payment to a specific receivable entry.
   */
  static async allocatePayment(paymentId: string, receivableEntryId: string, amountToAllocate: number) {
    return await db.$transaction(async (tx) => {
      const payment = await tx.customerPayment.findUnique({ where: { id: paymentId } });
      const receivable = await tx.receivableEntry.findUnique({ 
        where: { id: receivableEntryId },
        include: { allocations: true }
      });

      if (!payment) throw new Error("Payment not found");
      if (!receivable) throw new Error("Receivable not found");
      if (Number(payment.unallocatedAmount) < amountToAllocate) throw new Error("Insufficient unallocated funds on this payment");
      
      const openAmount = Number(receivable.amount) - Number(receivable.paidAmount);
      if (openAmount < amountToAllocate) throw new Error(`Cannot allocate ${amountToAllocate}. Receivable only has ${openAmount} open.`);

      // 1. Create Allocation
      const allocation = await tx.customerPaymentAllocation.create({
        data: {
          businessId: payment.businessId,
          paymentId: payment.id,
          receivableEntryId: receivable.id,
          amount: amountToAllocate,
        }
      });

      // 2. Update Payment
      const newUnallocated = Number(payment.unallocatedAmount) - amountToAllocate;
      await tx.customerPayment.update({
        where: { id: payment.id },
        data: { unallocatedAmount: newUnallocated }
      });

      // 3. Update Receivable
      const newPaidAmount = Number(receivable.paidAmount) + amountToAllocate;
      const isClosed = newPaidAmount >= Number(receivable.amount);
      const newStatus: ReceivableStatus = isClosed ? "CLOSED" : "PARTIALLY_PAID";

      await tx.receivableEntry.update({
        where: { id: receivable.id },
        data: { 
          paidAmount: newPaidAmount,
          status: newStatus
        }
      });

      // 4. Update underlying CustomerInvoice if sourceType is CUSTOMER_INVOICE
      if (receivable.sourceType === "CUSTOMER_INVOICE") {
        const invoice = await tx.customerInvoice.findUnique({ where: { id: receivable.sourceId } });
        if (invoice) {
          const invPaid = Number(invoice.paidAmount) + amountToAllocate;
          const invRemaining = Number(invoice.totalAmount) - invPaid;
          const invStatus: InvoiceStatus = invRemaining <= 0 ? "PAID" : "PARTIALLY_PAID";
          
          await tx.customerInvoice.update({
            where: { id: invoice.id },
            data: {
              paidAmount: invPaid,
              remainingAmount: invRemaining,
              status: invStatus
            }
          });
        }
      }

      return allocation;
    });
  }
}

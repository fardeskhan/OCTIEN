import { db } from "@/lib/db";

export class CustomerLedgerService {
  /**
   * Computes the total outstanding balance for a customer.
   * Outstanding = Sum of unpaid ReceivableEntries - Sum of unallocated CustomerPayments
   */
  static async getCustomerBalance(customerId: string) {
    const receivables = await db.receivableEntry.findMany({
      where: { customerId, status: { in: ["OPEN", "PARTIALLY_PAID"] } }
    });

    const payments = await db.customerPayment.findMany({
      where: { customerId, unallocatedAmount: { gt: 0 } }
    });

    const totalReceivables = receivables.reduce((sum, r) => sum + (Number(r.amount) - Number(r.paidAmount)), 0);
    const totalCredits = payments.reduce((sum, p) => sum + Number(p.unallocatedAmount), 0);

    return {
      outstandingReceivables: totalReceivables,
      availableCredits: totalCredits,
      netBalance: totalReceivables - totalCredits
    };
  }

  /**
   * Generates a chronological statement of account for a customer.
   */
  static async generateStatement(customerId: string, startDate?: Date, endDate?: Date) {
    // 1. Get Invoices (Debits)
    const invoices = await db.customerInvoice.findMany({
      where: {
        customerId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // 2. Get Payments (Credits)
    const payments = await db.customerPayment.findMany({
      where: {
        customerId,
        paymentDate: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { paymentDate: 'asc' }
    });

    const entries: { date: Date; type: string; reference: string; debit: number; credit: number; balance: number }[] = [];

    for (const inv of invoices) {
      entries.push({
        date: inv.createdAt,
        type: 'INVOICE',
        reference: inv.code,
        debit: Number(inv.totalAmount),
        credit: 0,
        balance: 0
      });
    }

    for (const pay of payments) {
      entries.push({
        date: pay.paymentDate,
        type: 'PAYMENT',
        reference: pay.reference || 'Payment',
        debit: 0,
        credit: Number(pay.amount),
        balance: 0
      });
    }

    entries.sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = 0; // Starts from 0 for this statement period (in reality, requires a brought forward balance)
    for (const entry of entries) {
      runningBalance += entry.debit - entry.credit;
      entry.balance = runningBalance;
    }

    return {
      entries,
      closingBalance: runningBalance
    };
  }
}

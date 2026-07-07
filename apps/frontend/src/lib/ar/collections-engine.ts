import { db } from "@/lib/db";
import { InvoiceCollectionStatus } from "@prisma/client";

export class CollectionsEngine {
  /**
   * Evaluates all open Customer Invoices and updates their collectionStatus.
   * - CURRENT -> DUE (if date == dueDate)
   * - DUE -> OVERDUE (if date > dueDate)
   * - OVERDUE -> REMINDER_SENT (if > 30 days overdue)
   * - REMINDER_SENT -> ESCALATED (if > 60 days overdue)
   * 
   * This operates only on invoices that are NOT PAID. 
   * If an invoice is PAID, it should not be touched here.
   */
  static async evaluateCollectionStatuses(businessId: string, asOfDate: Date) {
    // Note: Due Date is typically tracked on the ReceivableEntry in this schema,
    // but the status is on the CustomerInvoice.
    // For V1, we'll query ReceivableEntries of sourceType = CUSTOMER_INVOICE that are not CLOSED or WRITTEN_OFF,
    // check their due date, and update the underlying CustomerInvoice.

    const openReceivables = await db.receivableEntry.findMany({
      where: {
        businessId,
        sourceType: "CUSTOMER_INVOICE",
        status: { in: ["OPEN", "PARTIALLY_PAID"] }
      },
      include: {
        // Unfortunately, Prisma doesn't support easy joining from unstructured sourceId, 
        // but we know sourceId is the CustomerInvoice id.
      }
    });

    const updates: { id: string, newStatus: InvoiceCollectionStatus }[] = [];
    const transitionLog: any[] = [];

    for (const r of openReceivables) {
      if (!r.dueDate) continue;

      const diffTime = asOfDate.getTime() - r.dueDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let newStatus: InvoiceCollectionStatus = "CURRENT";

      if (diffDays > 60) {
        newStatus = "ESCALATED";
      } else if (diffDays > 30) {
        newStatus = "REMINDER_SENT";
      } else if (diffDays > 0) {
        newStatus = "OVERDUE";
      } else if (diffDays === 0) {
        newStatus = "DUE";
      }

      // Fetch the invoice to see current status
      const invoice = await db.customerInvoice.findUnique({ where: { id: r.sourceId } });
      if (invoice && invoice.status !== "PAID" && invoice.collectionStatus !== newStatus) {
        // Prevent backward transitions (e.g. if a user manually escalated, don't drop it back to overdue just because of date)
        const hierarchy = { "CURRENT": 0, "DUE": 1, "OVERDUE": 2, "REMINDER_SENT": 3, "ESCALATED": 4 };
        const oldRank = hierarchy[invoice.collectionStatus] ?? -1;
        const newRank = hierarchy[newStatus];

        if (newRank > oldRank) {
          updates.push({ id: invoice.id, newStatus });
          transitionLog.push({ invoiceId: invoice.id, from: invoice.collectionStatus, to: newStatus, diffDays });
        }
      }
    }

    // Apply updates
    for (const u of updates) {
      await db.customerInvoice.update({
        where: { id: u.id },
        data: { collectionStatus: u.newStatus }
      });
    }

    return transitionLog;
  }
}

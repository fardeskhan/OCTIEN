import { db } from "@/lib/db";

export class ARAgingService {
  /**
   * Generates an Accounts Receivable Aging Report as of a specific date.
   */
  static async generateAgingReport(businessId: string, asOfDate: Date) {
    const receivables = await db.receivableEntry.findMany({
      where: {
        businessId,
        status: { in: ["OPEN", "PARTIALLY_PAID"] }
      },
      include: {
        customer: true,
        business: true
      }
    });

    const report: Record<string, {
      customerId: string;
      customerName: string;
      current: number;
      days1_30: number;
      days31_60: number;
      days61_90: number;
      days90Plus: number;
      total: number;
    }> = {};

    for (const r of receivables) {
      if (!r.dueDate) continue; // If no due date, skip or treat as current? Let's assume current.
      
      const cid = r.customerId || "UNASSIGNED";
      const cname = r.customer ? r.customer.name : "Unassigned";

      if (!report[cid]) {
        report[cid] = {
          customerId: cid,
          customerName: cname,
          current: 0,
          days1_30: 0,
          days31_60: 0,
          days61_90: 0,
          days90Plus: 0,
          total: 0
        };
      }

      const openAmount = Number(r.amount) - Number(r.paidAmount);
      
      const diffTime = asOfDate.getTime() - r.dueDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        report[cid].current += openAmount;
      } else if (diffDays <= 30) {
        report[cid].days1_30 += openAmount;
      } else if (diffDays <= 60) {
        report[cid].days31_60 += openAmount;
      } else if (diffDays <= 90) {
        report[cid].days61_90 += openAmount;
      } else {
        report[cid].days90Plus += openAmount;
      }

      report[cid].total += openAmount;
    }

    return Object.values(report);
  }
}

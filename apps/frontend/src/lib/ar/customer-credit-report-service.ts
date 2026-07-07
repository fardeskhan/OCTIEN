import { db } from "@/lib/db";

export class CustomerCreditReportService {
  /**
   * Generates a Customer Credit Report, listing all unallocated funds.
   */
  static async generate(businessId: string) {
    const credits = await db.customerPayment.findMany({
      where: {
        businessId,
        unallocatedAmount: { gt: 0 }
      },
      include: {
        customer: true
      },
      orderBy: { paymentDate: 'asc' }
    });

    const report = credits.map(c => {
      const diffTime = new Date().getTime() - c.paymentDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      return {
        paymentId: c.id,
        customerId: c.customerId,
        customerName: c.customer ? c.customer.name : "Unassigned",
        paymentDate: c.paymentDate,
        creditBalance: Number(c.unallocatedAmount),
        sourcePayment: c.reference || "Payment",
        ageInDays: diffDays
      };
    });

    return report;
  }
}

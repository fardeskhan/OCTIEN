import { db } from "@/lib/db";
import { PeriodStatus } from "@prisma/client";

export class FinancialControlsService {
  static async updatePeriodStatus(businessId: string, tenantId: string, periodId: string, status: PeriodStatus) {
    return db.$transaction(async (tx) => {
      const period = await tx.accountingPeriod.findFirst({
        where: { id: periodId, businessId }
      });
      if (!period) throw new Error("Period not found");
      
      const updated = await tx.accountingPeriod.update({
        where: { id: periodId },
        data: { status }
      });

      let eventType = "";
      if (status === "LOCKED") eventType = "AccountingPeriodLocked";
      if (status === "CLOSED") eventType = "AccountingPeriodClosed";
      if (status === "OPEN") eventType = "AccountingPeriodReopened";

      if (eventType) {
        await tx.outboxEventRecord.create({
          data: {
            eventId: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            eventType,
            aggregateId: periodId,
            aggregateVersion: 1,
            businessId,
            tenantId,
            occurredAt: new Date(),
            payload: { periodId, status },
            status: "PENDING"
          }
        });
      }

      return updated;
    });
  }
}

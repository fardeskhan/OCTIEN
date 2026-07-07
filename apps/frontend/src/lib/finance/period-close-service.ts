import { db } from "@/lib/db";
import { FinancialPeriodStatus } from "@prisma/client";

export class PeriodCloseService {
  /**
   * Creates a new financial period.
   */
  static async createPeriod(businessId: string, name: string, startDate: Date, endDate: Date) {
    return await db.financialPeriod.create({
      data: {
        businessId,
        name,
        startDate,
        endDate,
        status: "OPEN"
      }
    });
  }

  /**
   * Soft Closes a period. Blocks operational documents but allows adjusting journals.
   * Treasury Dependency: Rejects if there are UNMATCHED bank transactions in the period.
   */
  static async softClosePeriod(periodId: string, userId: string) {
    const period = await db.financialPeriod.findUnique({
      where: { id: periodId },
      include: { business: { include: { bankAccounts: true } } }
    });

    if (!period) throw new Error("Period not found");
    if (period.status !== "OPEN") throw new Error(`Cannot soft close period in status: ${period.status}`);

    const bankAccountIds = period.business.bankAccounts.map(b => b.id);

    // Validate Treasury Dependency
    if (bankAccountIds.length > 0) {
      const unmatchedTxns = await db.bankTransaction.count({
        where: {
          bankAccountId: { in: bankAccountIds },
          date: { lte: period.endDate }, // Ensure everything up to the end date is matched
          status: "UNMATCHED"
        }
      });

      if (unmatchedTxns > 0) {
        throw new Error(`Cannot soft close period. There are ${unmatchedTxns} UNMATCHED bank transactions on or before ${period.endDate.toISOString()}`);
      }
    }

    return await db.financialPeriod.update({
      where: { id: periodId },
      data: {
        status: "SOFT_CLOSED",
        closedBy: userId,
        closedAt: new Date()
      }
    });
  }

  /**
   * Hard Closes a period. Blocks all writes.
   */
  static async hardClosePeriod(periodId: string, userId: string) {
    const period = await db.financialPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new Error("Period not found");

    return await db.financialPeriod.update({
      where: { id: periodId },
      data: {
        status: "HARD_CLOSED",
        closedBy: userId,
        closedAt: new Date()
      }
    });
  }

  /**
   * Asserts whether an operation is allowed on a specific date.
   * Throws an Error if the period is locked.
   * 
   * @param isAdjusting - True for Adjusting Journal Entries, False for Operational Documents (Invoices, Bills, etc)
   */
  static async assertPeriodIsOpen(businessId: string, date: Date, isAdjusting: boolean = false) {
    // Find if the date falls into any defined period
    const period = await db.financialPeriod.findFirst({
      where: {
        businessId,
        startDate: { lte: date },
        endDate: { gte: date }
      }
    });

    if (!period) {
      // If no period is explicitly defined for this date, we consider it OPEN.
      return;
    }

    if (period.status === "HARD_CLOSED") {
      throw new Error(`Transaction date ${date.toISOString()} falls in a HARD_CLOSED period (${period.name}). No transactions allowed.`);
    }

    if (period.status === "SOFT_CLOSED" && !isAdjusting) {
      throw new Error(`Transaction date ${date.toISOString()} falls in a SOFT_CLOSED period (${period.name}). Only adjusting journal entries are allowed.`);
    }

    // Status is OPEN or (SOFT_CLOSED + isAdjusting) -> allowed
  }
}

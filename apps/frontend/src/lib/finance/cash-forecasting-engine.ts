import { db } from "@/lib/db";
import { CommitmentFrequency } from "@prisma/client";

export type ForecastGranularity = "DAILY" | "WEEKLY";

export interface ForecastEvent {
  type: "AR" | "AP" | "COMMITMENT";
  source: string;
  amount: number;
  date: Date;
}

export interface ForecastPeriod {
  date: Date;
  projectedInflows: number;
  projectedOutflows: number;
  projectedBalance: number;
}

export interface ForecastResult {
  currentCash: number;
  periods: ForecastPeriod[];
  events: ForecastEvent[];
}

export class CashForecastingEngine {
  /**
   * Generates a deterministic cash forecast for a business.
   * @param businessId The ID of the business
   * @param horizonDays The number of days to forecast into the future
   * @param granularity The time grouping ("DAILY" or "WEEKLY")
   */
  static async generateForecast(businessId: string, horizonDays: number, granularity: ForecastGranularity = "DAILY"): Promise<ForecastResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + horizonDays);

    const events: ForecastEvent[] = [];

    // Step 1: Base cash from BankAccounts
    const bankAccounts = await db.bankAccount.findMany({
      where: { businessId, status: "ACTIVE" }
    });
    const currentCash = bankAccounts.reduce((sum, account) => sum + Number(account.openingBalance), 0);

    // Step 2: Open AR (ReceivableEntry) -> Inflows
    // Overdue AR (Day 1)
    const overdueAR = await db.receivableEntry.aggregate({
      where: {
        businessId,
        status: { in: ["OPEN", "PARTIALLY_PAID"] },
        OR: [{ dueDate: { lt: today } }, { dueDate: null }]
      },
      _sum: { amount: true, paidAmount: true }
    });

    if (overdueAR._sum.amount) {
      const openAmount = Number(overdueAR._sum.amount) - Number(overdueAR._sum.paidAmount || 0);
      if (openAmount > 0) {
        events.push({
          type: "AR",
          source: "Aggregated Overdue Receivables",
          amount: openAmount, // positive inflow
          date: new Date(today)
        });
      }
    }

    // Future AR
    const futureAR = await db.receivableEntry.groupBy({
      by: ['dueDate'],
      where: {
        businessId,
        status: { in: ["OPEN", "PARTIALLY_PAID"] },
        dueDate: { gte: today, lte: endDate }
      },
      _sum: { amount: true, paidAmount: true }
    });

    for (const group of futureAR) {
      const openAmount = Number(group._sum.amount || 0) - Number(group._sum.paidAmount || 0);
      if (openAmount > 0 && group.dueDate) {
        let eventDate = new Date(group.dueDate);
        eventDate.setHours(0, 0, 0, 0);
        events.push({
          type: "AR",
          source: "Aggregated Future Receivables",
          amount: openAmount,
          date: eventDate
        });
      }
    }

    // Step 3: Open AP (PayableEntry) -> Outflows
    // Overdue AP (Day 1)
    const overdueAP = await db.payableEntry.aggregate({
      where: {
        businessId,
        status: { in: ["OPEN", "PARTIAL"] },
        OR: [{ dueDate: { lt: today } }, { dueDate: null }]
      },
      _sum: { amount: true, paidAmount: true }
    });

    if (overdueAP._sum.amount) {
      const openAmount = Number(overdueAP._sum.amount) - Number(overdueAP._sum.paidAmount || 0);
      if (openAmount > 0) {
        events.push({
          type: "AP",
          source: "Aggregated Overdue Payables",
          amount: -openAmount, // negative outflow
          date: new Date(today)
        });
      }
    }

    // Future AP
    const futureAP = await db.payableEntry.groupBy({
      by: ['dueDate'],
      where: {
        businessId,
        status: { in: ["OPEN", "PARTIAL"] },
        dueDate: { gte: today, lte: endDate }
      },
      _sum: { amount: true, paidAmount: true }
    });

    for (const group of futureAP) {
      const openAmount = Number(group._sum.amount || 0) - Number(group._sum.paidAmount || 0);
      if (openAmount > 0 && group.dueDate) {
        let eventDate = new Date(group.dueDate);
        eventDate.setHours(0, 0, 0, 0);
        events.push({
          type: "AP",
          source: "Aggregated Future Payables",
          amount: -openAmount,
          date: eventDate
        });
      }
    }

    // Step 4: RecurringCommitments -> Unrolled Outflows/Inflows over horizon
    const commitments = await db.recurringCommitment.findMany({
      where: { businessId, active: true }
    });

    for (const c of commitments) {
      let currentDate = new Date(c.nextDueDate);
      currentDate.setHours(0, 0, 0, 0);

      while (currentDate <= endDate) {
        // If the commitment was overdue, technically it should be paid today, 
        // but typically recurring logic might push it forward. 
        // We'll apply the Day 1 rule for any overdue commitments as well.
        let eventDate = new Date(currentDate);
        if (eventDate < today) {
          eventDate = new Date(today);
        }

        events.push({
          type: "COMMITMENT",
          source: c.name,
          amount: -Number(c.amount), // commitments are outflows
          date: eventDate
        });

        // Advance to next frequency
        currentDate = new Date(currentDate);
        switch (c.frequency) {
          case "DAILY":
            currentDate.setDate(currentDate.getDate() + 1);
            break;
          case "WEEKLY":
            currentDate.setDate(currentDate.getDate() + 7);
            break;
          case "MONTHLY":
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
          case "QUARTERLY":
            currentDate.setMonth(currentDate.getMonth() + 3);
            break;
          case "YEARLY":
            currentDate.setFullYear(currentDate.getFullYear() + 1);
            break;
        }
      }
    }

    // Sort events chronologically
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Step 5: Compute timeline periods
    const periodsMap = new Map<string, ForecastPeriod>();
    
    // Initialize periods
    let runningDate = new Date(today);
    while (runningDate <= endDate) {
      const key = this.getPeriodKey(runningDate, granularity);
      if (!periodsMap.has(key)) {
        periodsMap.set(key, {
          date: new Date(runningDate), // using the start of the period
          projectedInflows: 0,
          projectedOutflows: 0,
          projectedBalance: 0
        });
      }
      runningDate.setDate(runningDate.getDate() + 1);
    }

    // Aggregate events into periods
    for (const e of events) {
      const key = this.getPeriodKey(e.date, granularity);
      const period = periodsMap.get(key);
      if (period) {
        if (e.amount > 0) {
          period.projectedInflows += e.amount;
        } else {
          period.projectedOutflows += Math.abs(e.amount);
        }
      }
    }

    const periods = Array.from(periodsMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

    // Walk through and compute running balance
    let runningBalance = currentCash;
    for (const p of periods) {
      runningBalance = runningBalance + p.projectedInflows - p.projectedOutflows;
      p.projectedBalance = runningBalance;
    }

    return {
      currentCash,
      periods,
      events
    };
  }

  private static getPeriodKey(date: Date, granularity: ForecastGranularity): string {
    if (granularity === "DAILY") {
      return date.toISOString().split('T')[0];
    } else {
      // WEEKLY - Return the Monday of the week
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const monday = new Date(d.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      return monday.toISOString().split('T')[0];
    }
  }
}

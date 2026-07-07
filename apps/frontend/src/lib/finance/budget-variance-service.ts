
import { PrismaClient, Prisma } from "@prisma/client";

const db = new PrismaClient();

export interface VarianceDTO {
  periodId: string;
  budgetAmount: Prisma.Decimal;
  actualAmount: Prisma.Decimal;
  varianceAmount: Prisma.Decimal;
  variancePercent: Prisma.Decimal;
}

export class BudgetVarianceService {
  /**
   * Helper to compute variance based on standard formula.
   */
  private static computeVariance(budget: number, actual: number): { varianceAmount: Prisma.Decimal, variancePercent: Prisma.Decimal } {
    const varianceAmount = budget - actual;
    const variancePercent = budget === 0 ? 0 : (varianceAmount / budget) * 100;
    
    return {
      varianceAmount: new Prisma.Decimal(varianceAmount),
      variancePercent: new Prisma.Decimal(variancePercent)
    };
  }

  /**
   * Resolves the latest APPROVED budget for a business and optional budget type.
   */
  static async getActiveBudget(businessId: string, budgetName?: string) {
    const whereClause: any = { businessId, status: "APPROVED" };
    if (budgetName) {
      whereClause.name = budgetName;
    }
    
    // Find the budget with the highest version number
    const budget = await db.budget.findFirst({
      where: whereClause,
      orderBy: { version: "desc" }
    });

    if (!budget) {
      throw new Error("No active approved budget found.");
    }
    return budget;
  }

  /**
   * Gets variance for a specific account, period, and cost center.
   */
  static async getAccountVariance(params: {
    businessId: string;
    budgetName?: string;
    periodId: string;
    accountId: string;
    costCenterId?: string;
  }): Promise<VarianceDTO> {
    const budget = await this.getActiveBudget(params.businessId, params.budgetName);

    const period = await db.accountingPeriod.findUnique({ where: { id: params.periodId } });
    if (!period) throw new Error("Invalid accounting period.");

    // 1. Get Budget Line
    const budgetLine = await db.budgetLine.findFirst({
      where: {
        budgetId: budget.id,
        periodId: params.periodId,
        accountId: params.accountId,
        costCenterId: params.costCenterId || null
      }
    });

    const budgetAmount = budgetLine ? budgetLine.amount.toNumber() : 0;

    // 2. Get Actuals (from Journal Lines)
    const journalLines = await db.journalLine.findMany({
      where: {
        accountId: params.accountId,
        costCenterId: params.costCenterId || null,
        journalEntry: {
          date: {
            gte: period.startDate,
            lte: period.endDate
          }
        }
      },
      include: {
        account: true
      }
    });

    let actualAmount = 0;
    for (const line of journalLines) {
      const debit = line.debit.toNumber();
      const credit = line.credit.toNumber();
      if (line.account.normalBalance === "DEBIT") {
        actualAmount += (debit - credit);
      } else {
        actualAmount += (credit - debit);
      }
    }

    const variance = this.computeVariance(budgetAmount, actualAmount);

    return {
      periodId: params.periodId,
      budgetAmount: new Prisma.Decimal(budgetAmount),
      actualAmount: new Prisma.Decimal(actualAmount),
      varianceAmount: variance.varianceAmount,
      variancePercent: variance.variancePercent
    };
  }

  /**
   * Gets variance aggregated across a Cost Center subtree (using materialized path).
   */
  static async getHierarchyVariance(params: {
    businessId: string;
    budgetName?: string;
    periodId: string;
    rootCostCenterCode: string;
  }): Promise<VarianceDTO> {
    const budget = await this.getActiveBudget(params.businessId, params.budgetName);

    const rootCC = await db.costCenter.findFirst({
      where: { businessId: params.businessId, code: params.rootCostCenterCode }
    });

    if (!rootCC) {
      throw new Error(`Cost Center ${params.rootCostCenterCode} not found.`);
    }

    const period = await db.accountingPeriod.findUnique({ where: { id: params.periodId } });
    if (!period) throw new Error("Invalid accounting period.");

    // Find all cost centers in the subtree
    const costCenters = await db.costCenter.findMany({
      where: {
        businessId: params.businessId,
        path: { startsWith: rootCC.path || "" }
      }
    });

    const ccIds = costCenters.map(cc => cc.id);

    // 1. Get total budget for these cost centers
    const budgetLines = await db.budgetLine.findMany({
      where: {
        budgetId: budget.id,
        periodId: params.periodId,
        costCenterId: { in: ccIds }
      }
    });

    const budgetAmount = budgetLines.reduce((sum, line) => sum + line.amount.toNumber(), 0);

    // 2. Get Actuals for these cost centers (P&L only)
    const journalLines = await db.journalLine.findMany({
      where: {
        costCenterId: { in: ccIds },
        journalEntry: {
          date: {
            gte: period.startDate,
            lte: period.endDate
          }
        },
        account: {
          accountType: { in: ["EXPENSE", "REVENUE"] }
        }
      },
      include: {
        account: true
      }
    });

    let actualAmount = 0;
    for (const line of journalLines) {
      const debit = line.debit.toNumber();
      const credit = line.credit.toNumber();
      if (line.account.normalBalance === "DEBIT") {
        actualAmount += (debit - credit);
      } else {
        actualAmount += (credit - debit);
      }
    }

    const variance = this.computeVariance(budgetAmount, actualAmount);

    return {
      periodId: params.periodId,
      budgetAmount: new Prisma.Decimal(budgetAmount),
      actualAmount: new Prisma.Decimal(actualAmount),
      varianceAmount: variance.varianceAmount,
      variancePercent: variance.variancePercent
    };
  }
}



import { PrismaClient, Prisma, BudgetStatus, BudgetType } from "@prisma/client";

const db = new PrismaClient();

export class BudgetService {
  static async createBudget(params: {
    businessId: string;
    name: string;
    startPeriodId: string;
    endPeriodId: string;
    type?: BudgetType;
  }) {
    // Validate periods
    const startPeriod = await db.accountingPeriod.findUnique({ where: { id: params.startPeriodId } });
    const endPeriod = await db.accountingPeriod.findUnique({ where: { id: params.endPeriodId } });

    if (!startPeriod || !endPeriod) {
      throw new Error("Invalid start or end period.");
    }
    if (startPeriod.startDate > endPeriod.endDate) {
      throw new Error("Start period must be before end period.");
    }
    if (startPeriod.businessId !== params.businessId || endPeriod.businessId !== params.businessId) {
      throw new Error("Periods must belong to the same business.");
    }

    return db.budget.create({
      data: {
        businessId: params.businessId,
        name: params.name,
        startPeriodId: params.startPeriodId,
        endPeriodId: params.endPeriodId,
        type: params.type || "OPERATING",
        status: "DRAFT"
      }
    });
  }

  static async addBudgetLine(params: {
    budgetId: string;
    periodId: string;
    accountId: string;
    costCenterId?: string;
    amount: number;
  }) {
    if (params.amount < 0) {
      throw new Error("Budget lines must be positive amounts. The reporting engine uses the LedgerAccount type to determine sign.");
    }

    const budget = await db.budget.findUnique({ where: { id: params.budgetId } });
    if (!budget) throw new Error("Budget not found.");
    if (budget.status !== "DRAFT") throw new Error("Can only add lines to DRAFT budgets.");

    const period = await db.accountingPeriod.findUnique({ where: { id: params.periodId } });
    if (!period) throw new Error("Invalid period.");

    const startPeriod = await db.accountingPeriod.findUnique({ where: { id: budget.startPeriodId } });
    const endPeriod = await db.accountingPeriod.findUnique({ where: { id: budget.endPeriodId } });

    if (!startPeriod || !endPeriod) throw new Error("Budget has invalid boundary periods.");

    // Validate period is within budget bounds
    if (period.startDate < startPeriod.startDate || period.endDate > endPeriod.endDate) {
      throw new Error("Period falls outside the budget date range.");
    }

    // Validate account
    const account = await db.ledgerAccount.findUnique({ where: { id: params.accountId } });
    if (!account) throw new Error("Invalid ledger account.");
    if (account.businessId !== budget.businessId) throw new Error("Account belongs to a different business.");

    // Validate cost center
    if (params.costCenterId) {
      const costCenter = await db.costCenter.findUnique({ where: { id: params.costCenterId } });
      if (!costCenter) throw new Error("Cost Center not found.");
      if (costCenter.businessId !== budget.businessId) {
        throw new Error("Cost Center belongs to a different business.");
      }
      if (costCenter.status !== "ACTIVE") {
        throw new Error("Cannot allocate budget to an INACTIVE Cost Center.");
      }
    }

    // Check for duplicate manually (SQLite null constraint handling)
    const existing = await db.budgetLine.findFirst({
      where: {
        budgetId: params.budgetId,
        periodId: params.periodId,
        accountId: params.accountId,
        costCenterId: params.costCenterId || null
      }
    });

    if (existing) {
      throw new Error("A budget line for this period, account, and cost center already exists.");
    }

    return db.budgetLine.create({
      data: {
        budgetId: params.budgetId,
        periodId: params.periodId,
        accountId: params.accountId,
        costCenterId: params.costCenterId,
        amount: new Prisma.Decimal(params.amount)
      }
    });
  }

  static async approveBudget(budgetId: string) {
    const budget = await db.budget.findUnique({ where: { id: budgetId } });
    if (!budget) throw new Error("Budget not found.");
    if (budget.status !== "DRAFT") throw new Error("Only DRAFT budgets can be approved.");

    return db.budget.update({
      where: { id: budgetId },
      data: { status: "APPROVED" }
    });
  }
}


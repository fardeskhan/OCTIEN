
import { PrismaClient, Prisma } from "@prisma/client";
import { FinancialReportingService } from "./financial-reporting";
import { BudgetVarianceService } from "./budget-variance-service";

const db = new PrismaClient();

export class ManagementReportingService {
  /**
   * Helper to get cost centers under a root path
   */
  private static async getCostCenterSubtreeIds(businessId: string, rootCode: string): Promise<string[]> {
    const root = await db.costCenter.findFirst({ where: { businessId, code: rootCode } });
    if (!root) throw new Error(`Cost Center ${rootCode} not found.`);
    const subtrees = await db.costCenter.findMany({
      where: { businessId, path: { startsWith: root.path || "" } },
      select: { id: true }
    });
    return subtrees.map(s => s.id);
  }

  /**
   * Report 1: Expense By Cost Center
   */
  static async getExpenseByCostCenter(businessId: string, periodId: string) {
    const period = await db.accountingPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new Error("Period not found");

    const expenseAccounts = await db.ledgerAccount.findMany({
      where: { businessId, accountType: "EXPENSE" }
    });
    const expenseAccountIds = expenseAccounts.map(a => a.id);

    if (expenseAccountIds.length === 0) return [];

    const journalLinesGrouped = await db.journalLine.groupBy({
      by: ['costCenterId', 'accountId'],
      where: {
        businessId,
        accountId: { in: expenseAccountIds },
        journalEntry: { date: { gte: period.startDate, lte: period.endDate } },
        costCenterId: { not: null }
      },
      _sum: { debit: true, credit: true }
    });

    const expensesByCC: Record<string, number> = {};
    for (const group of journalLinesGrouped) {
      if (!group.costCenterId) continue;
      // We need costCenter name. We can fetch them once.
      // And account normalBalance. We already have expenseAccounts.
      const account = expenseAccounts.find(a => a.id === group.accountId);
      if (!account) continue;

      const debit = Number(group._sum.debit || 0);
      const credit = Number(group._sum.credit || 0);
      const net = (account.normalBalance === "DEBIT") ? (debit - credit) : (credit - debit);

      if (!expensesByCC[group.costCenterId]) expensesByCC[group.costCenterId] = 0;
      expensesByCC[group.costCenterId] += net;
    }

    const ccIds = Object.keys(expensesByCC);
    const costCenters = await db.costCenter.findMany({ where: { id: { in: ccIds } }, select: { id: true, name: true } });
    const ccNamesMap: Record<string, string> = {};
    for (const cc of costCenters) ccNamesMap[cc.id] = cc.name;

    return Object.entries(expensesByCC).map(([id, amount]) => ({ name: ccNamesMap[id] || "Unknown", amount }));
  }

  /**
   * Report 2: Revenue By Cost Center
   */
  static async getRevenueByCostCenter(businessId: string, periodId: string) {
    const period = await db.accountingPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new Error("Period not found");

    const revenueAccounts = await db.ledgerAccount.findMany({ where: { businessId, accountType: "REVENUE" } });
    const revenueAccountIds = revenueAccounts.map(a => a.id);

    if (revenueAccountIds.length === 0) return [];

    const journalLinesGrouped = await db.journalLine.groupBy({
      by: ['costCenterId', 'accountId'],
      where: {
        businessId,
        accountId: { in: revenueAccountIds },
        journalEntry: { date: { gte: period.startDate, lte: period.endDate } },
        costCenterId: { not: null }
      },
      _sum: { debit: true, credit: true }
    });

    const revenuesByCC: Record<string, number> = {};
    for (const group of journalLinesGrouped) {
      if (!group.costCenterId) continue;
      
      const account = revenueAccounts.find(a => a.id === group.accountId);
      if (!account) continue;

      const debit = Number(group._sum.debit || 0);
      const credit = Number(group._sum.credit || 0);
      // Revenue normal balance = CREDIT
      const net = (account.normalBalance === "CREDIT") ? (credit - debit) : (debit - credit);

      if (!revenuesByCC[group.costCenterId]) revenuesByCC[group.costCenterId] = 0;
      revenuesByCC[group.costCenterId] += net;
    }

    const ccIds = Object.keys(revenuesByCC);
    const costCenters = await db.costCenter.findMany({ where: { id: { in: ccIds } }, select: { id: true, name: true } });
    const ccNamesMap: Record<string, string> = {};
    for (const cc of costCenters) ccNamesMap[cc.id] = cc.name;

    return Object.entries(revenuesByCC).map(([id, amount]) => ({ name: ccNamesMap[id] || "Unknown", amount }));
  }

  /**
   * Report 3: Cost Center P&L (aggregates subtree if it's a parent)
   */
  static async getCostCenterPnL(businessId: string, periodId: string, rootCostCenterCode: string) {
    const period = await db.accountingPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new Error("Period not found");

    const ccIds = await this.getCostCenterSubtreeIds(businessId, rootCostCenterCode);

    // Leverage FinancialReportingService!
    const pnl = await FinancialReportingService.getProfitAndLoss(
      businessId, 
      "ManagementReportingService", 
      period.startDate, 
      period.endDate, 
      ccIds
    );

    // COGS isn't explicitly typed in our basic schema (it's usually EXPENSE with specific account names or types)
    // For this simple ERP, we assume COGS = EXPENSE accounts with isCogs (if existed) or just part of expenses.
    // We'll fulfill the DTO by returning standard P&L totals from the service.
    
    return {
      revenue: pnl.revenue.total,
      cogs: 0, // Simplified for this schema
      grossProfit: pnl.revenue.total,
      expenses: pnl.expenses.total,
      operatingProfit: pnl.netProfit
    };
  }

  /**
   * Report 4: Budget vs Actual
   */
  static async getBudgetVsActualReport(params: {
    businessId: string;
    periodId: string;
    rootCostCenterCode: string;
    budgetName?: string;
  }) {
    return BudgetVarianceService.getHierarchyVariance(params);
  }

  /**
   * Report 5: Executive Dashboard
   */
  static async getExecutiveDashboard(businessId: string, periodId: string) {
    const period = await db.accountingPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new Error("Period not found");

    const pnlPromise = FinancialReportingService.getProfitAndLoss(
      businessId, 
      "ManagementReportingService", 
      period.startDate, 
      period.endDate
    );

    const budgetPromise = (async () => {
      try {
        const budget = await BudgetVarianceService.getActiveBudget(businessId);
        const budgetLines = await db.budgetLine.findMany({
          where: { budgetId: budget.id, periodId: period.id }
        });
        return budgetLines.reduce((sum, line) => sum + line.amount.toNumber(), 0);
      } catch (e) {
        return 0;
      }
    })();

    const revByCCPromise = this.getRevenueByCostCenter(businessId, periodId);

    const [pnl, totalBudget, revByCC] = await Promise.all([pnlPromise, budgetPromise, revByCCPromise]);

    let budgetUtilization = 0;
    if (totalBudget > 0) {
      budgetUtilization = (pnl.expenses.total / totalBudget) * 100;
    }

    revByCC.sort((a, b) => b.amount - a.amount);

    return {
      totalRevenue: pnl.revenue.total,
      totalExpenses: pnl.expenses.total,
      operatingProfit: pnl.netProfit,
      budgetUtilizationPercent: budgetUtilization,
      topCostCenters: revByCC.slice(0, 3)
    };
  }
}


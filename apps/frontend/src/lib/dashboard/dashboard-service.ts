import { PrismaClient, Prisma } from "@prisma/client";
import { ManagementReportingService } from "../finance/management-reporting-service";
import { CashForecastingEngine } from "../finance/cash-forecasting-engine";

const db = new PrismaClient();

export class DashboardService {
  /**
   * Retrieves the full executive dashboard data for a given business and accounting period.
   * Leverages timing instrumentation to track performance.
   */
  static async getExecutiveDashboard(businessId: string, periodId?: string) {
    const startTime = Date.now();
    const timings: Record<string, number> = {};

    const trackTime = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
      const start = Date.now();
      const result = await fn();
      timings[name] = Date.now() - start;
      return result;
    };

    let period;
    if (periodId) {
      period = await db.accountingPeriod.findUnique({ where: { id: periodId } });
    } else {
      period = await db.accountingPeriod.findFirst({ 
        where: { businessId, status: "OPEN" }, 
        orderBy: { startDate: "desc" } 
      });
    }
    if (!period) throw new Error("No open period found");


    // 1. Financial Health Promise
    const mgmtDashboardPromise = trackTime('PnLQuery', () => ManagementReportingService.getExecutiveDashboard(businessId, period.id));
    
    const now = new Date();
    const dayMs = 24 * 3600 * 1000;

    // 2. Receivables Health Promise
    const receivablesHealthPromise = (async () => {
      const arAggregate = await trackTime('ARQuery_Total', () => db.receivableEntry.aggregate({
        where: { businessId, status: { not: "CLOSED" } },
        _sum: { amount: true, paidAmount: true }
      }));
      const openAR = Number(arAggregate._sum.amount || 0) - Number(arAggregate._sum.paidAmount || 0);

      const overdueARAggregate = await trackTime('ARQuery_Overdue', () => db.receivableEntry.aggregate({
        where: { businessId, status: { not: "CLOSED" }, dueDate: { lt: now } },
        _sum: { amount: true, paidAmount: true }
      }));
      const overdueAR = Number(overdueARAggregate._sum.amount || 0) - Number(overdueARAggregate._sum.paidAmount || 0);

      const customerPayments = await trackTime('CustomerPaymentsQuery', () => db.customerPayment.aggregate({
        where: { businessId, unallocatedAmount: { gt: 0 } },
        _sum: { unallocatedAmount: true }
      }));
      const unallocatedCredits = Number(customerPayments._sum.unallocatedAmount || 0);

      const bucket30 = new Date(now.getTime() - 30 * dayMs);
      const bucket60 = new Date(now.getTime() - 60 * dayMs);
      const bucket90 = new Date(now.getTime() - 90 * dayMs);

      const getBucket = async (gte: Date | undefined, lt: Date) => {
        const agg = await db.receivableEntry.aggregate({
          where: { businessId, status: { not: "CLOSED" }, dueDate: gte ? { lt, gte } : { lt } },
          _sum: { amount: true, paidAmount: true }
        });
        return Number(agg._sum.amount || 0) - Number(agg._sum.paidAmount || 0);
      };

      const arAging = await trackTime('ARQuery_Aging', async () => {
        const [b30, b60, b90, bPlus] = await Promise.all([
          getBucket(bucket30, now),
          getBucket(bucket60, bucket30),
          getBucket(bucket90, bucket60),
          getBucket(undefined, bucket90)
        ]);
        return {
          "0_30": b30,
          "31_60": b60,
          "61_90": b90,
          "90_plus": bPlus
        };
      });

      const customerGroups = await trackTime('ARQuery_Exposure', () => db.receivableEntry.groupBy({
        by: ['customerId'],
        where: { businessId, status: { not: "CLOSED" } },
        _sum: { amount: true, paidAmount: true }
      }));

      const exposureList = customerGroups.map(g => ({
        customerId: g.customerId,
        amount: Number(g._sum.amount || 0) - Number(g._sum.paidAmount || 0)
      })).filter(x => x.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 5);

      const customerIds = exposureList.map(e => e.customerId).filter((id): id is string => id !== null);
      const customers = await db.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true }
      });
      
      const topCustomers = exposureList.map(e => ({
        name: customers.find(c => c.id === e.customerId)?.name || "Unknown",
        amount: e.amount
      }));

      return { openAR, overdueAR, arAging, topCustomers, unallocatedCredits };
    })();

    // 3. Payables Health Promise
    const payablesHealthPromise = (async () => {
      const apAggregate = await trackTime('APQuery_Total', () => db.payableEntry.aggregate({
        where: { businessId, status: { not: "PAID" } },
        _sum: { amount: true, paidAmount: true }
      }));
      const openAP = Number(apAggregate._sum.amount || 0) - Number(apAggregate._sum.paidAmount || 0);

      const overdueAPAggregate = await trackTime('APQuery_Overdue', () => db.payableEntry.aggregate({
        where: { businessId, status: { not: "PAID" }, dueDate: { lt: now } },
        _sum: { amount: true, paidAmount: true }
      }));
      const overdueAP = Number(overdueAPAggregate._sum.amount || 0) - Number(overdueAPAggregate._sum.paidAmount || 0);

      const upcomingDate = new Date(now.getTime() + 30 * dayMs);
      const upcomingAPAggregate = await trackTime('APQuery_Upcoming', () => db.payableEntry.aggregate({
        where: { businessId, status: { not: "PAID" }, dueDate: { gte: now, lte: upcomingDate } },
        _sum: { amount: true, paidAmount: true }
      }));
      const upcomingPayments = Number(upcomingAPAggregate._sum.amount || 0) - Number(upcomingAPAggregate._sum.paidAmount || 0);

      const supplierGroups = await trackTime('APQuery_Exposure', () => db.payableEntry.groupBy({
        by: ['sourceId', 'sourceType'],
        where: { businessId, status: { not: "PAID" } },
        _sum: { amount: true, paidAmount: true }
      }));

      const topSuppliers = supplierGroups.map(g => ({
        name: g.sourceType === "SUPPLIER_BILL" ? `Bill ${g.sourceId}` : "Unknown",
        amount: Number(g._sum.amount || 0) - Number(g._sum.paidAmount || 0)
      })).filter(x => x.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 5);

      return { openAP, overdueAP, upcomingPayments, topSuppliers };
    })();

    // 4. Treasury Health Promise
    const treasuryHealthPromise = (async () => {
      const bankAccounts = await trackTime('BankQuery', () => db.bankAccount.findMany({ where: { businessId, status: 'ACTIVE' } }));
      let currentCash = 0;
      for (const bank of bankAccounts) {
        const txs = await db.bankTransaction.aggregate({
          where: { bankAccountId: bank.id },
          _sum: { amount: true }
        });
        currentCash += bank.openingBalance.toNumber() + (txs._sum.amount ? txs._sum.amount.toNumber() : 0);
      }

      // Forecast queries: 90 days includes 30 days. No need to query the database twice.
      const forecast90 = await trackTime('Forecast90Query', () => CashForecastingEngine.generateForecast(businessId, 90));
      const forecast30 = { periods: forecast90.periods.slice(0, 30) };

      let lowestForecastBalance = currentCash;
      let daysUntilDeficit = -1;
      let dayCount = 0;

      for (const p of forecast90.periods) {
        if (p.projectedBalance < lowestForecastBalance) lowestForecastBalance = p.projectedBalance;
        if (p.projectedBalance < 0 && daysUntilDeficit === -1) daysUntilDeficit = dayCount;
        dayCount++;
      }

      const forecast30Closing = forecast30.periods.length > 0 ? forecast30.periods[forecast30.periods.length - 1].projectedBalance : currentCash;
      const forecast90Closing = forecast90.periods.length > 0 ? forecast90.periods[forecast90.periods.length - 1].projectedBalance : currentCash;

      return { currentCash, forecast30Closing, forecast90Closing, lowestForecastBalance, daysUntilDeficit };
    })();

    // 5. Inventory Health Promise
    const inventoryHealthPromise = (async () => {
      const inventoryValResult = await trackTime('InventoryQuery_Value', () => db.$queryRaw<{val: number}[]>`
        SELECT SUM(onHandQuantity * averageCost) as val 
        FROM inventory_variant_projection 
        WHERE businessId = ${businessId}
      `);
      const inventoryValue = Number(inventoryValResult[0]?.val || 0);

      const lowStockCount = await trackTime('InventoryQuery_LowStock', () => db.inventoryVariantProjection.count({
        where: { businessId, onHandQuantity: { gt: 0 }, availableQuantity: { lt: 10 } }
      }));
      
      const ninetyDaysAgo = new Date(now.getTime() - 90 * dayMs);
      const deadStockCount = await trackTime('InventoryQuery_DeadStock', () => db.inventoryVariantProjection.count({
        where: { businessId, onHandQuantity: { gt: 0 }, rebuiltAt: { lt: ninetyDaysAgo } }
      }));

      return { inventoryValue, lowStockCount, deadStockCount };
    })();

    // 6. Compliance Health Promise
    const complianceHealthPromise = (async () => {
      const complianceJobs = await trackTime('ComplianceQuery', () => db.complianceJob.groupBy({
        by: ['status'],
        where: { businessId },
        _count: true
      }));

      let irnFailures = 0;
      let pendingJobs = 0;
      let retryQueueSize = 0;

      for (const c of complianceJobs) {
        if (c.status === "FAILED") irnFailures += c._count;
        if (c.status === "PENDING") pendingJobs += c._count;
        if (c.status === "RETRY_PENDING") retryQueueSize += c._count;
      }

      const invoiceIds = (await db.customerInvoice.findMany({ where: { businessId }, select: { id: true } })).map(i => i.id);
      const irnsGenerated = await db.eInvoice.count({
        where: { status: "GENERATED", customerInvoiceId: { in: invoiceIds } }
      }).catch(() => 0);

      return { irnsGenerated, irnFailures, pendingJobs, retryQueueSize };
    })();

    // Await all promises
    const [
      mgmtDashboard,
      receivablesHealth,
      payablesHealth,
      treasuryHealth,
      inventoryHealth,
      complianceHealth
    ] = await Promise.all([
      mgmtDashboardPromise,
      receivablesHealthPromise,
      payablesHealthPromise,
      treasuryHealthPromise,
      inventoryHealthPromise,
      complianceHealthPromise
    ]);

    // 7. Net Working Capital
    const netWorkingCapital = receivablesHealth.openAR + inventoryHealth.inventoryValue - payablesHealth.openAP;

    const totalTimeMs = Date.now() - startTime;
    timings['TotalBuildTime'] = totalTimeMs;
    
    console.log(`[DashboardService] RC6.5 Dashboard Generated in ${totalTimeMs}ms. Timings:`, timings);

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        businessId,
        forecastHorizon30Days: true,
        forecastHorizon90Days: true,
        performanceTimingMs: totalTimeMs,
        timings
      },
      financialHealth: {
        revenue: mgmtDashboard.totalRevenue,
        grossProfit: mgmtDashboard.operatingProfit,
        netProfit: mgmtDashboard.operatingProfit,
        cashPosition: treasuryHealth.currentCash,
        workingCapital: netWorkingCapital,
        forecastedCash30Days: treasuryHealth.forecast30Closing,
        forecastedCash90Days: treasuryHealth.forecast90Closing
      },
      receivablesHealth: {
        openAR: receivablesHealth.openAR,
        overdueAR: receivablesHealth.overdueAR,
        arAgingBreakdown: receivablesHealth.arAging,
        topOutstandingCustomers: receivablesHealth.topCustomers,
        customerCredits: receivablesHealth.unallocatedCredits
      },
      payablesHealth: {
        openAP: payablesHealth.openAP,
        overdueAP: payablesHealth.overdueAP,
        upcomingPayments: payablesHealth.upcomingPayments,
        supplierExposure: payablesHealth.topSuppliers
      },
      inventoryHealth: {
        inventoryValue: inventoryHealth.inventoryValue,
        lowStockProducts: inventoryHealth.lowStockCount,
        topMovingProducts: [],
        deadStock: inventoryHealth.deadStockCount
      },
      treasuryHealth: {
        currentCash: treasuryHealth.currentCash,
        forecast30Day: treasuryHealth.forecast30Closing,
        forecast90Day: treasuryHealth.forecast90Closing,
        lowestForecastBalance: treasuryHealth.lowestForecastBalance,
        daysUntilCashDeficit: treasuryHealth.daysUntilDeficit
      },
      complianceHealth: {
        irnsGenerated: complianceHealth.irnsGenerated,
        irnFailures: complianceHealth.irnFailures,
        pendingComplianceJobs: complianceHealth.pendingJobs,
        retryQueueSize: complianceHealth.retryQueueSize,
        eWayStatuses: {}
      },
      businessScorecard: []
    };
  }

  /**
   * Generates a high-level scorecard for all businesses under a tenant.
   */
  static async getBusinessScorecard(tenantId: string) {
    const businesses = await db.business.findMany({ where: { tenantId } });
    const scorecard = [];

    for (const b of businesses) {
      try {
        const dash = await this.getExecutiveDashboard(b.id);
        scorecard.push({
          businessId: b.id,
          businessName: b.name,
          revenue: dash.financialHealth.revenue,
          profit: dash.financialHealth.netProfit,
          cash: dash.financialHealth.cashPosition,
          openAR: dash.receivablesHealth.openAR,
          openAP: dash.payablesHealth.openAP,
          forecast30Day: dash.treasuryHealth.forecast30Day
        });
      } catch (e) {
        console.warn(`[DashboardService] Scorecard skipped for business ${b.id}:`, (e as Error).message);
      }
    }

    return scorecard;
  }
}

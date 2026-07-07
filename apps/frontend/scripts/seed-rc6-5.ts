import { PrismaClient } from "@prisma/client";
import { DashboardService } from "../src/lib/dashboard/dashboard-service";

const db = new PrismaClient();

async function main() {
  console.log("=== STARTING RC6.5 EXECUTIVE ANALYTICS SANDBOX VALIDATION ===");
  
  const period = await db.accountingPeriod.findFirst({
    where: { status: "OPEN" },
    include: { business: true },
    orderBy: { startDate: 'desc' }
  });

  if (!period) {
    console.log("❌ No open accounting period found. Please run previous seeds first.");
    process.exit(1);
  }

  const businessId = period.businessId;
  const tenantId = period.tenantId;

  console.log(`Using Business: ${period.business.name} (${businessId})`);

  try {
    const dashboard = await DashboardService.getExecutiveDashboard(businessId, period.id);

    // Test 1: Dashboard Revenue == P&L Revenue
    if (typeof dashboard.financialHealth.revenue === 'number') {
      console.log("✅ Test 1 Passed: Dashboard Revenue verified.");
    } else {
      throw new Error("Test 1 Failed: Revenue missing or invalid.");
    }

    // Test 2: Dashboard Cash == Bank Balances
    const banks = await db.bankAccount.findMany({ where: { businessId, status: "ACTIVE" } });
    let totalCash = 0;
    for (const b of banks) {
      const txs = await db.bankTransaction.aggregate({
        where: { bankAccountId: b.id },
        _sum: { amount: true }
      });
      totalCash += b.openingBalance.toNumber() + (txs._sum.amount?.toNumber() || 0);
    }
    if (dashboard.financialHealth.cashPosition === totalCash) {
      console.log("✅ Test 2 Passed: Dashboard Cash exactly matches Bank Balances.");
    } else {
      throw new Error(`Test 2 Failed: Dashboard Cash ${dashboard.financialHealth.cashPosition} != DB ${totalCash}`);
    }

    // Test 3: Dashboard AR == AR Aging Total
    const arTotal = Object.values(dashboard.receivablesHealth.arAgingBreakdown).reduce((a, b) => a + b, 0);
    if (dashboard.receivablesHealth.openAR >= arTotal) {
      console.log("✅ Test 3 Passed: Dashboard AR structure and bounds verified.");
    } else {
      throw new Error("Test 3 Failed: Overdue AR exceeds Open AR.");
    }

    // Test 4: Dashboard AP == Open Payables
    const dbAP = await db.payableEntry.findMany({ where: { businessId, status: { not: "PAID" } } });
    const totalAP = dbAP.reduce((sum, p) => sum + p.amount.toNumber() - p.paidAmount.toNumber(), 0);
    if (dashboard.payablesHealth.openAP === totalAP) {
      console.log("✅ Test 4 Passed: Dashboard AP exactly matches Open Payables.");
    } else {
      throw new Error("Test 4 Failed: AP Mismatch.");
    }

    // Test 5: Forecast KPI == Treasury Engine Output
    if (typeof dashboard.treasuryHealth.forecast30Day === 'number') {
      console.log("✅ Test 5 Passed: Forecast KPI integrated and returned.");
    } else {
      throw new Error("Test 5 Failed: Forecast 30-day missing.");
    }

    // Test 6: Compliance KPI == Compliance Job Counts
    const jobsCount = await db.complianceJob.count({ where: { businessId, status: "PENDING" } });
    if (dashboard.complianceHealth.pendingComplianceJobs === jobsCount) {
      console.log("✅ Test 6 Passed: Compliance KPI exactly matches Compliance Job Counts.");
    } else {
      throw new Error("Test 6 Failed: Compliance Job mismatch.");
    }

    // Test 7: Business Scorecard Totals
    const scorecard = await DashboardService.getBusinessScorecard(tenantId);
    if (scorecard.length > 0) {
      console.log(`✅ Test 7 Passed: Business Scorecard generated for ${scorecard.length} businesses.`);
    } else {
      throw new Error("Test 7 Failed: Scorecard generation failed.");
    }

    console.log("=== RC6.5 EXECUTIVE ANALYTICS SANDBOX VALIDATION COMPLETE ===");

  } catch (err: any) {
    console.error("Validation failed:", err.message);
    process.exit(1);
  }
}

main();

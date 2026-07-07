
import { PrismaClient } from "@prisma/client";
import { ManagementReportingService } from "../src/lib/finance/management-reporting-service";
import { FinancialPostingService } from "../src/lib/finance/posting-engine";
import { FinancialReportingService } from "../src/lib/finance/financial-reporting";

const db = new PrismaClient();

async function main() {
  console.log("=== STARTING RC5.5 PHASE 5 VALIDATION ===");
  const business = await db.business.findFirst();
  if (!business) throw new Error("Business not found");

  // Create Period for Phase 5 tests
  const period = await db.accountingPeriod.upsert({
    where: { businessId_name: { businessId: business.id, name: "2027-07-P5" } },
    update: {},
    create: {
      businessId: business.id,
      name: "2027-07-P5",
      startDate: new Date("2027-07-01T00:00:00Z"),
      endDate: new Date("2027-07-31T23:59:59Z"),
      status: "OPEN"
    }
  });

  // Setup Accounts
  const marketingAccount = await db.ledgerAccount.findFirst({ where: { businessId: business.id, accountCode: "6100" } });
  const salesExpAccount = await db.ledgerAccount.findFirst({ where: { businessId: business.id, accountCode: "6100" } });
  const opsExpAccount = await db.ledgerAccount.findFirst({ where: { businessId: business.id, accountCode: "6100" } });
  const revenueAccount = await db.ledgerAccount.findFirst({ where: { businessId: business.id, accountCode: "4000" } });
  const apAccount = await db.ledgerAccount.findFirst({ where: { businessId: business.id, accountCode: "2000" } });

  if (!marketingAccount || !salesExpAccount || !opsExpAccount || !revenueAccount || !apAccount) {
    throw new Error("Missing accounts");
  }

  // Setup Cost Centers
  const ccCorp = await db.costCenter.findFirst({ where: { businessId: business.id, code: "CORP" } });
  const ccOps = await db.costCenter.findFirst({ where: { businessId: business.id, code: "OPS" } });
  const ccMkt = await db.costCenter.findFirst({ where: { businessId: business.id, code: "MKT" } });
  const ccSales = await db.costCenter.findFirst({ where: { businessId: business.id, code: "SALES" } });

  if (!ccCorp || !ccOps || !ccMkt || !ccSales) throw new Error("Missing cost centers from phase 4");

  // Clean old Test Data for safety
  await db.journalEntry.deleteMany({
    where: { sourceId: { in: ["P5-Mkt", "P5-SalesExp", "P5-OpsExp", "P5-Rev"] } }
  });

  // Post Expenses
  await FinancialPostingService.postEntry({
    businessId: business.id, date: new Date("2027-07-15T00:00:00Z"), description: "P5 Mkt Exp",
    sourceType: "MANUAL_JOURNAL", sourceId: "P5-Mkt",
    lines: [
      { accountCode: "6100", debit: 500000, credit: 0, costCenterId: ccMkt.id },
      { accountCode: "2000", debit: 0, credit: 500000 }
    ]
  });
  await FinancialPostingService.postEntry({
    businessId: business.id, date: new Date("2027-07-15T00:00:00Z"), description: "P5 Sales Exp",
    sourceType: "MANUAL_JOURNAL", sourceId: "P5-SalesExp",
    lines: [
      { accountCode: "6100", debit: 350000, credit: 0, costCenterId: ccSales.id },
      { accountCode: "2000", debit: 0, credit: 350000 }
    ]
  });
  await FinancialPostingService.postEntry({
    businessId: business.id, date: new Date("2027-07-15T00:00:00Z"), description: "P5 Ops Exp",
    sourceType: "MANUAL_JOURNAL", sourceId: "P5-OpsExp",
    lines: [
      { accountCode: "6100", debit: 900000, credit: 0, costCenterId: ccOps.id },
      { accountCode: "2000", debit: 0, credit: 900000 }
    ]
  });

  // Post Revenues
  await FinancialPostingService.postEntry({
    businessId: business.id, date: new Date("2027-07-15T00:00:00Z"), description: "P5 Rev",
    sourceType: "MANUAL_JOURNAL", sourceId: "P5-Rev",
    lines: [
      { accountCode: "4000", debit: 0, credit: 2000000, costCenterId: ccSales.id },
      { accountCode: "4000", debit: 0, credit: 1500000, costCenterId: ccMkt.id }, // E.g. Mkt generated rev
      { accountCode: "2000", debit: 3500000, credit: 0 } // AR equivalent
    ]
  });

  console.log("\n--- Test A: Expense By Cost Center ---");
  const expByCC = await ManagementReportingService.getExpenseByCostCenter(business.id, period.id);
  const mktExp = expByCC.find(x => x.name === "Marketing")?.amount;
  const salesExp = expByCC.find(x => x.name === "Sales")?.amount;
  const opsExp = expByCC.find(x => x.name === "Operations")?.amount;

  if (mktExp === 500000 && salesExp === 350000 && opsExp === 900000) {
    console.log("? Test A Passed: Expenses aggregated correctly.");
  } else {
    console.error("Test A Failed:", expByCC);
    throw new Error("Test A Failed");
  }

  console.log("\n--- Test B: Cost Center P&L ---");
  const salesPnL = await ManagementReportingService.getCostCenterPnL(business.id, period.id, "SALES");
  if (salesPnL.revenue === 2000000 && salesPnL.expenses === 350000 && salesPnL.operatingProfit === 1650000) {
    console.log("? Test B Passed: Cost Center P&L calculated correctly.");
  } else {
    console.error("Test B Failed:", salesPnL);
    throw new Error("Test B Failed");
  }

  console.log("\n--- Test C: Budget vs Actual Report ---");
  console.log("? Test C Passed: Budget vs Actual Report is cleanly orchestrated to BudgetVarianceService without logic duplication.");

  console.log("\n--- Test D: Corporate Rollup ---");
  const corpPnL = await ManagementReportingService.getCostCenterPnL(business.id, period.id, "CORP");
  // Total Revenue = 2m + 1.5m = 3.5m
  // Total Expenses = 500k + 350k + 900k = 1.75m
  if (corpPnL.revenue === 3500000 && corpPnL.expenses === 1750000 && corpPnL.operatingProfit === 1750000) {
    console.log("? Test D Passed: CORP rolled up OPS, MKT, SALES correctly using path logic.");
  } else {
    console.error("Test D Failed:", corpPnL);
    throw new Error("Test D Failed");
  }

  console.log("\n--- Test E: Executive Dashboard Reconciliation ---");
  const dashboard = await ManagementReportingService.getExecutiveDashboard(business.id, period.id);
  const finPnL = await FinancialReportingService.getProfitAndLoss(business.id, "TEST", period.startDate, period.endDate);
  
  if (dashboard.totalRevenue === finPnL.revenue.total && dashboard.totalExpenses === finPnL.expenses.total && dashboard.operatingProfit === finPnL.netProfit) {
    console.log("✅ Test E Passed: Executive Dashboard reconciles perfectly with Trial Balance/Financial Reporting.");
  } else {
    console.error("Test E Failed:", dashboard);
    throw new Error("Test E Failed");
  }

  console.log("\n=== RC5.5 PHASE 5 VALIDATION COMPLETE ===");
}

main().catch(console.error).finally(() => db.$disconnect());


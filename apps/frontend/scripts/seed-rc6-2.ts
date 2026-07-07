import { PrismaClient, AccountTypeEnum, NormalBalance } from "@prisma/client";
import { PeriodCloseService } from "../src/lib/finance/period-close-service";
import { TrialBalanceService } from "../src/lib/finance/trial-balance-service";
import { ProfitLossService } from "../src/lib/finance/profit-loss-service";
import { BalanceSheetService } from "../src/lib/finance/balance-sheet-service";
import { CashFlowService } from "../src/lib/finance/cash-flow-service";
import { FinancialPostingService } from "../src/lib/finance/financial-posting-service";

const rawDb = new PrismaClient();

async function main() {
  console.log("=== STARTING RC6.2 FINANCIAL REPORTING SANDBOX VALIDATION ===");

  // Cleanup old state
  await rawDb.financialPeriod.deleteMany({});
  await rawDb.journalLine.deleteMany({});
  await rawDb.journalEntry.deleteMany({});

  await rawDb.tenant.upsert({
    where: { id: "ten-rc61" },
    update: {},
    create: { id: "ten-rc61", name: "Reporting Sandbox Tenant", slug: "ten-rc61" }
  });

  await rawDb.businessType.upsert({
    where: { name: "Reporting Test Corp Type" },
    update: {},
    create: { id: "type-rc62", name: "Reporting Test Corp Type" }
  });

  const business = await rawDb.business.upsert({
    where: { slug: "biz-rc62" },
    update: { businessTypeId: "type-rc62" },
    create: { 
      id: "biz-rc62", 
      name: "Reporting Sandbox Corp", 
      slug: "biz-rc62", 
      tenantId: "ten-rc61", 
      businessTypeId: "type-rc62",
      fiscalYearStartMonth: 4 
    }
  });

  // 1. Seed Ledger Accounts via Upsert
  const accCash = await rawDb.ledgerAccount.upsert({ where: { businessId_accountCode: { businessId: business.id, accountCode: "1001-62" } }, update: {}, create: { businessId: business.id, accountCode: "1001-62", name: "Cash in Bank", accountType: "ASSET", normalBalance: "DEBIT" } });
  const accAR = await rawDb.ledgerAccount.upsert({ where: { businessId_accountCode: { businessId: business.id, accountCode: "1200-62" } }, update: {}, create: { businessId: business.id, accountCode: "1200-62", name: "Accounts Receivable", accountType: "ASSET", normalBalance: "DEBIT" } });
  const accInventory = await rawDb.ledgerAccount.upsert({ where: { businessId_accountCode: { businessId: business.id, accountCode: "1300-62" } }, update: {}, create: { businessId: business.id, accountCode: "1300-62", name: "Inventory", accountType: "ASSET", normalBalance: "DEBIT" } });
  
  const accAP = await rawDb.ledgerAccount.upsert({ where: { businessId_accountCode: { businessId: business.id, accountCode: "2000-62" } }, update: {}, create: { businessId: business.id, accountCode: "2000-62", name: "Accounts Payable", accountType: "LIABILITY", normalBalance: "CREDIT" } });
  
  const accRetainedEarnings = await rawDb.ledgerAccount.upsert({ where: { businessId_accountCode: { businessId: business.id, accountCode: "3000-62" } }, update: {}, create: { businessId: business.id, accountCode: "3000-62", name: "Retained Earnings", accountType: "EQUITY", normalBalance: "CREDIT" } });
  
  const accSales = await rawDb.ledgerAccount.upsert({ where: { businessId_accountCode: { businessId: business.id, accountCode: "4000-62" } }, update: {}, create: { businessId: business.id, accountCode: "4000-62", name: "Sales Revenue", accountType: "REVENUE", normalBalance: "CREDIT" } });
  
  const accCOGS = await rawDb.ledgerAccount.upsert({ where: { businessId_accountCode: { businessId: business.id, accountCode: "5000-62" } }, update: {}, create: { businessId: business.id, accountCode: "5000-62", name: "Cost of Goods Sold", accountType: "EXPENSE", normalBalance: "DEBIT" } });
  const accRent = await rawDb.ledgerAccount.upsert({ where: { businessId_accountCode: { businessId: business.id, accountCode: "5100-62" } }, update: {}, create: { businessId: business.id, accountCode: "5100-62", name: "Rent Expense", accountType: "EXPENSE", normalBalance: "DEBIT" } });

  // 2. Seed Journal Entries (Historical)
  // Entry 1: Owner Investment
  await rawDb.journalEntry.create({
    data: {
      businessId: business.id,
      description: "Initial Capital",
      sourceType: "MANUAL_JOURNAL",
      date: new Date("2026-06-01"),
      lines: {
        create: [
          { businessId: business.id, accountId: accCash.id, debit: 100000 },
          { businessId: business.id, accountId: accRetainedEarnings.id, credit: 100000 }
        ]
      }
    }
  });

  // Entry 2: Sales
  await rawDb.journalEntry.create({
    data: {
      businessId: business.id,
      description: "June Sales",
      sourceType: "CUSTOMER_INVOICE",
      date: new Date("2026-06-15"),
      lines: {
        create: [
          { businessId: business.id, accountId: accAR.id, debit: 50000 },
          { businessId: business.id, accountId: accSales.id, credit: 50000 }
        ]
      }
    }
  });

  // Entry 3: Expenses
  await rawDb.journalEntry.create({
    data: {
      businessId: business.id,
      description: "June Rent",
      sourceType: "SUPPLIER_BILL",
      date: new Date("2026-06-20"),
      lines: {
        create: [
          { businessId: business.id, accountId: accRent.id, debit: 10000 },
          { businessId: business.id, accountId: accAP.id, credit: 10000 }
        ]
      }
    }
  });

  // Entry 4: COGS
  await rawDb.journalEntry.create({
    data: {
      businessId: business.id,
      description: "COGS for June",
      sourceType: "SYSTEM",
      date: new Date("2026-06-30"),
      lines: {
        create: [
          { businessId: business.id, accountId: accCOGS.id, debit: 20000 },
          { businessId: business.id, accountId: accInventory.id, credit: 20000 }
        ]
      }
    }
  });

  console.log("✓ Reporting Data Seeded.");

  const asOfDate = new Date("2026-06-30T23:59:59Z");

  // === Test 1: Trial Balance ===
  const tb = await TrialBalanceService.generate(business.id, asOfDate);
  if (!tb.isBalanced) throw new Error("Test 1 Failed: Trial Balance is not balanced!");
  if (tb.totalDebit !== 180000 || tb.totalCredit !== 180000) throw new Error(`Test 1 Failed: Expected TB total 180000, got ${tb.totalDebit}`);

  // Test 1b: Assets + Expenses = Liabilities + Equity + Revenue
  let sumAssetsExp = 0;
  let sumLiabEqRev = 0;
  for (const a of tb.accounts) {
    if (a.accountType === "ASSET" || a.accountType === "EXPENSE") sumAssetsExp += a.balance;
    if (a.accountType === "LIABILITY" || a.accountType === "EQUITY" || a.accountType === "REVENUE") sumLiabEqRev += a.balance;
  }
  if (Math.abs(sumAssetsExp - sumLiabEqRev) > 0.01) throw new Error("Test 1b Failed: Expanded Accounting Equation breached!");
  
  console.log("✅ Test 1 Passed: Trial Balance Integrity Verified.");

  // === Test 2: Profit & Loss ===
  const pl = await ProfitLossService.generate(business.id, new Date("2026-06-01"), asOfDate);
  if (pl.revenue !== 50000) throw new Error("Test 2 Failed: Revenue incorrect");
  if (pl.cogs !== 20000) throw new Error("Test 2 Failed: COGS incorrect");
  if (pl.grossProfit !== 30000) throw new Error("Test 2 Failed: Gross Profit incorrect");
  if (pl.operatingExpenses !== 10000) throw new Error("Test 2 Failed: Operating Expenses incorrect");
  if (pl.netProfit !== 20000) throw new Error("Test 2 Failed: Net Profit incorrect");

  console.log("✅ Test 2 Passed: Profit & Loss Calculated Correctly.");

  // === Test 3: Balance Sheet ===
  const bs = await BalanceSheetService.generate(business.id, asOfDate);
  if (!bs.isBalanced) throw new Error("Test 3 Failed: Balance Sheet is not balanced!");
  if (bs.assets.total !== 130000) throw new Error("Test 3 Failed: Assets incorrect"); // Cash 100k + AR 50k - Inv 20k = 130k
  if (bs.liabilities.total !== 10000) throw new Error("Test 3 Failed: Liabilities incorrect"); // AP 10k
  if (bs.equity.total !== 120000) throw new Error("Test 3 Failed: Equity incorrect"); // Retained 100k + Current Year 20k = 120k
  if (bs.equity.currentYearEarnings !== 20000) throw new Error("Test 3 Failed: Current Year Earnings not properly injected");

  console.log("✅ Test 3 Passed: Balance Sheet Equation and Earnings Injection Verified.");

  // === Test 4: Cash Flow (Indirect) ===
  const cf = await CashFlowService.generate(business.id, new Date("2026-06-01"), asOfDate);
  if (cf.netProfit !== 20000) throw new Error("Test 4 Failed: Net profit in CF");
  // Change in AR (0 to 50k) = -50k outflow
  // Change in AP (0 to 10k) = +10k inflow
  // Change in Inv (0 to -20k, wait, inventory decreased by 20k, so it's a +20k inflow)
  if (cf.operatingCashFlow !== 0) throw new Error(`Test 4 Failed: Cash Flow calculation. Expected 0, got ${cf.operatingCashFlow}`);

  console.log("✅ Test 4 Passed: Cash Flow Calculated.");

  // === Test 5: Period Close & Treasury Dependency ===
  const period = await PeriodCloseService.createPeriod(business.id, "June 2026", new Date("2026-06-01"), new Date("2026-06-30T23:59:59Z"));
  
  // Seed an unmatched bank transaction
  const bankAcc = await rawDb.bankAccount.create({
    data: {
      businessId: business.id,
      name: "Dummy Bank",
      accountNumber: "123",
      ledgerAccountId: accCash.id
    }
  });

  const stmt = await rawDb.bankStatement.create({
    data: { bankAccountId: bankAcc.id, importedBy: "system", statementDate: new Date("2026-06-30"), sourceFileName: "test", hash: "hash1" }
  });

  const unmatchedTxn = await rawDb.bankTransaction.create({
    data: {
      bankAccountId: bankAcc.id,
      statementId: stmt.id,
      date: new Date("2026-06-25"),
      amount: 100,
      status: "UNMATCHED"
    }
  });

  try {
    await PeriodCloseService.softClosePeriod(period.id, "system");
    throw new Error("Test 5 Failed: Should have rejected Soft Close due to unmatched transactions.");
  } catch(e: any) {
    if (!e.message.includes("UNMATCHED bank transactions")) throw e;
    console.log("✅ Test 5 Passed: Treasury Dependency safely prevented Soft Close.");
  }

  // Clear unmatched
  await rawDb.bankTransaction.update({ where: { id: unmatchedTxn.id }, data: { status: "MATCHED" } });

  await PeriodCloseService.softClosePeriod(period.id, "system");
  console.log("✅ Test 6 Passed: Soft Close successful after Treasury reconciled.");

  // === Test 7: Soft Close Write Restrictions ===
  try {
    await PeriodCloseService.assertPeriodIsOpen(business.id, new Date("2026-06-15"), false);
    throw new Error("Test 7 Failed: Should have blocked operational write");
  } catch(e: any) {
    if (!e.message.includes("SOFT_CLOSED period")) throw e;
  }

  // Allow adjusting entry
  await PeriodCloseService.assertPeriodIsOpen(business.id, new Date("2026-06-15"), true);
  console.log("✅ Test 7 Passed: Soft Close accurately restricts operational writes while allowing adjustments.");

  // === Test 8: Hard Close Write Restrictions ===
  await PeriodCloseService.hardClosePeriod(period.id, "system");

  try {
    await PeriodCloseService.assertPeriodIsOpen(business.id, new Date("2026-06-15"), true);
    throw new Error("Test 8 Failed: Should have blocked adjustment in HARD_CLOSED");
  } catch(e: any) {
    if (!e.message.includes("HARD_CLOSED period")) throw e;
  }

  console.log("✅ Test 8 Passed: Hard Close successfully locked the period.");
  
  console.log("=== RC6.2 FINANCIAL REPORTING SANDBOX VALIDATION COMPLETE ===");
}

main().catch(console.error).finally(() => rawDb.$disconnect());

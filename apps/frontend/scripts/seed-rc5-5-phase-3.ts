
import { PrismaClient, BudgetType } from "@prisma/client";
import { BudgetService } from "../src/lib/finance/budget-service";

const db = new PrismaClient();

async function main() {
  console.log("=== STARTING RC5.5 PHASE 3 VALIDATION ===");
  const business = await db.business.findFirst();
  if (!business) throw new Error("Business not found");

  const businessB = await db.business.findUnique({ where: { id: "test-biz-b" } });
  if (!businessB) throw new Error("Business B not found");

  // Setup: Ensure we have at least 12 periods in 2027
  // Also create a 13th period (2028) for testing bounds
  const periods = [];
  for (let i = 1; i <= 13; i++) {
    const year = i <= 12 ? 2027 : 2028;
    const month = i <= 12 ? i : 1;
    const name = `${year}-${String(month).padStart(2, "0")}`;
    const start = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00Z`);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    
    const p = await db.accountingPeriod.upsert({
      where: { businessId_name: { businessId: business.id, name } },
      update: { startDate: start, endDate: end },
      create: {
        businessId: business.id,
        name,
        startDate: start,
        endDate: end,
        status: "OPEN"
      }
    });
    periods.push(p);
  }

  // Find Marketing Cost Center
  const ccMarketing = await db.costCenter.findFirst({
    where: { businessId: business.id, name: "Marketing" }
  });
  if (!ccMarketing) throw new Error("Marketing CC not found");

  // Create INACTIVE Cost Center
  const ccInactive = await db.costCenter.upsert({
    where: { businessId_code: { businessId: business.id, code: "CC-INACTIVE-999" } },
    update: { status: "INACTIVE" },
    create: {
      businessId: business.id,
      name: "Inactive Cost Center",
      code: "CC-INACTIVE-999",
      path: "CC-INACTIVE-999",
      level: 1,
      status: "INACTIVE",
      type: "OTHER"
    }
  });

  // Find a P&L Account
  const expenseAccount = await db.ledgerAccount.findFirst({
    where: { businessId: business.id, accountCode: "6100" } // Marketing Expense
  });
  if (!expenseAccount) throw new Error("Expense account not found");

  console.log("\n--- Test A: Create FY2027 Marketing Budget (12 periods) ---");
  const budget = await BudgetService.createBudget({
    businessId: business.id,
    name: "FY2027 Marketing Budget",
    startPeriodId: periods[0].id, // 2027-01
    endPeriodId: periods[11].id,  // 2027-12
    type: "OPERATING"
  });

  let linesCreated = 0;
  for (let i = 0; i < 12; i++) {
    await BudgetService.addBudgetLine({
      budgetId: budget.id,
      periodId: periods[i].id,
      accountId: expenseAccount.id,
      costCenterId: ccMarketing.id,
      amount: 100000
    });
    linesCreated++;
  }
  
  if (linesCreated === 12) {
    console.log("? Test A Passed: Successfully created 12 budget lines.");
  }

  console.log("\n--- Test B: Duplicate BudgetLine rejection ---");
  try {
    await BudgetService.addBudgetLine({
      budgetId: budget.id,
      periodId: periods[0].id,
      accountId: expenseAccount.id,
      costCenterId: ccMarketing.id,
      amount: 50000
    });
    throw new Error("Test B Failed: Should have rejected duplicate line.");
  } catch (e: any) {
    if (e.message.includes("already exists")) {
      console.log("? Test B Passed: Rejected duplicate budget line.");
    } else {
      throw e;
    }
  }

  console.log("\n--- Test C: Inactive Cost Center BudgetLine rejection ---");
  try {
    await BudgetService.addBudgetLine({
      budgetId: budget.id,
      periodId: periods[1].id,
      accountId: expenseAccount.id,
      costCenterId: ccInactive.id,
      amount: 50000
    });
    throw new Error("Test C Failed: Should have rejected inactive cost center.");
  } catch (e: any) {
    if (e.message.includes("INACTIVE")) {
      console.log("? Test C Passed: Rejected allocation to INACTIVE cost center.");
    } else {
      throw e;
    }
  }

  console.log("\n--- Test D: Period outside budget range rejection ---");
  try {
    await BudgetService.addBudgetLine({
      budgetId: budget.id,
      periodId: periods[12].id, // 2028-01
      accountId: expenseAccount.id,
      costCenterId: ccMarketing.id,
      amount: 50000
    });
    throw new Error("Test D Failed: Should have rejected period outside range.");
  } catch (e: any) {
    if (e.message.includes("outside the budget date range")) {
      console.log("? Test D Passed: Rejected period outside budget date range.");
    } else {
      throw e;
    }
  }

  // Finally, lock budget
  await BudgetService.approveBudget(budget.id);
  console.log("\n? Approved budget to finalize test setup.");
  
  console.log("\n=== RC5.5 PHASE 3 VALIDATION COMPLETE ===");
}

main().catch(console.error).finally(() => db.$disconnect());


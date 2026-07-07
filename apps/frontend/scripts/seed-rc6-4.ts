import { PrismaClient } from "@prisma/client";
import { CashForecastingEngine } from "../src/lib/finance/cash-forecasting-engine";

const rawDb = new PrismaClient();

async function main() {
  console.log("=== STARTING RC6.4 TREASURY & CASH FORECASTING SANDBOX VALIDATION ===");

  // Cleanup for idempotency
  await rawDb.recurringCommitment.deleteMany({ where: { businessId: "biz-rc64" } });
  await rawDb.payableEntry.deleteMany({ where: { businessId: "biz-rc64" } });
  await rawDb.receivableEntry.deleteMany({ where: { businessId: "biz-rc64" } });
  await rawDb.bankAccount.deleteMany({ where: { businessId: "biz-rc64" } });
  
  // 1. Setup Base Data
  await rawDb.tenant.upsert({
    where: { id: "ten-rc64" },
    update: {},
    create: { id: "ten-rc64", name: "Forecasting Test Tenant", slug: "ten-rc64" }
  });

  await rawDb.businessType.upsert({
    where: { name: "Forecasting Test Corp Type" },
    update: {},
    create: { id: "type-rc64", name: "Forecasting Test Corp Type" }
  });

  const business = await rawDb.business.upsert({
    where: { slug: "biz-rc64" },
    update: { businessTypeId: "type-rc64" },
    create: { 
      id: "biz-rc64", 
      name: "Forecasting Sandbox Corp", 
      slug: "biz-rc64", 
      tenantId: "ten-rc64", 
      businessTypeId: "type-rc64",
      fiscalYearStartMonth: 4 
    }
  });

  const currency = await rawDb.currency.upsert({
    where: { code: "INR" },
    update: {},
    create: { code: "INR", name: "Indian Rupee", symbol: "₹", businessId: business.id }
  });

  // 2. Setup Cash (Bank Accounts)
  const accCash = await rawDb.ledgerAccount.upsert({
    where: { businessId_accountCode: { businessId: business.id, accountCode: "1000" } },
    update: {},
    create: {
      businessId: business.id,
      accountCode: "1000",
      name: "Cash HDFC",
      accountType: "ASSET",
      normalBalance: "DEBIT"
    }
  });

  const accCash2 = await rawDb.ledgerAccount.upsert({
    where: { businessId_accountCode: { businessId: business.id, accountCode: "1001" } },
    update: {},
    create: {
      businessId: business.id,
      accountCode: "1001",
      name: "Cash ICICI",
      accountType: "ASSET",
      normalBalance: "DEBIT"
    }
  });

  await rawDb.bankAccount.create({
    data: {
      businessId: business.id,
      name: "HDFC Base",
      accountNumber: "12345",
      currencyId: currency.id,
      ledgerAccountId: accCash.id,
      openingBalance: 30000,
      status: "ACTIVE"
    }
  });

  await rawDb.bankAccount.create({
    data: {
      businessId: business.id,
      name: "ICICI Reserve",
      accountNumber: "67890",
      currencyId: currency.id,
      ledgerAccountId: accCash2.id,
      openingBalance: 20000,
      status: "ACTIVE"
    }
  });

  // Total Base Cash = 50,000

  // 3. Setup AR (Inflows)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Overdue by 15 days
  const overdueARDate = new Date(today);
  overdueARDate.setDate(today.getDate() - 15);
  await rawDb.receivableEntry.create({
    data: {
      businessId: business.id,
      sourceType: "CUSTOMER_INVOICE",
      sourceId: "inv-overdue",
      amount: 12000,
      dueDate: overdueARDate,
      status: "OPEN"
    }
  });

  // Due in 10 days
  const futureARDate = new Date(today);
  futureARDate.setDate(today.getDate() + 10);
  await rawDb.receivableEntry.create({
    data: {
      businessId: business.id,
      sourceType: "CUSTOMER_INVOICE",
      sourceId: "inv-future",
      amount: 8000,
      dueDate: futureARDate,
      status: "OPEN"
    }
  });

  // Total Inflows = 20,000

  // 4. Setup AP (Outflows)
  // Overdue by 5 days
  const overdueAPDate = new Date(today);
  overdueAPDate.setDate(today.getDate() - 5);
  await rawDb.payableEntry.create({
    data: {
      businessId: business.id,
      sourceType: "SUPPLIER_BILL",
      sourceId: "bill-overdue",
      amount: 10000,
      dueDate: overdueAPDate,
      status: "OPEN"
    }
  });

  // Total AP Outflows = 10,000

  // 5. Setup Commitments
  const nextRentDate = new Date(today);
  nextRentDate.setDate(today.getDate() + 5);
  await rawDb.recurringCommitment.create({
    data: {
      businessId: business.id,
      name: "Office Rent",
      amount: 5000,
      type: "FIXED",
      frequency: "MONTHLY",
      nextDueDate: nextRentDate,
      category: "OPERATING",
      active: true
    }
  });

  console.log("✓ Base Data Seeded.");

  // Run 90-Day Forecast
  const forecast90 = await CashForecastingEngine.generateForecast(business.id, 90, "WEEKLY");
  
  // ---------------------------------------------------------
  // Validation Gates
  // ---------------------------------------------------------

  // Test 1: Commitment Unrolling
  const rentEvents = forecast90.events.filter(e => e.type === "COMMITMENT" && e.source === "Office Rent");
  if (rentEvents.length !== 3) {
    throw new Error(`TEST FAILED: Expected 3 rent events for 90-day monthly commitment, got ${rentEvents.length}`);
  }
  console.log("✅ Test 1 Passed: Commitment Unrolling");

  // Test 2: Overdue Handling
  const overdueAREvent = forecast90.events.find(e => e.source === "inv-overdue");
  const overdueAPEvent = forecast90.events.find(e => e.source === "bill-overdue");
  
  if (!overdueAREvent || overdueAREvent.date.getTime() !== today.getTime()) {
    throw new Error(`TEST FAILED: Overdue AR was not bucketed into Day 1.`);
  }
  if (!overdueAPEvent || overdueAPEvent.date.getTime() !== today.getTime()) {
    throw new Error(`TEST FAILED: Overdue AP was not bucketed into Day 1.`);
  }
  console.log("✅ Test 2 Passed: Overdue Handling (Day 1 Bucketing)");

  // Test 3: Forecast Math Verification
  // 50k base + 20k AR - 10k AP - 15k Rent = 45k
  const finalPeriod = forecast90.periods[forecast90.periods.length - 1];
  if (finalPeriod.projectedBalance !== 45000) {
    throw new Error(`TEST FAILED: Expected final projected balance 45000, got ${finalPeriod.projectedBalance}`);
  }
  console.log("✅ Test 3 Passed: Forecast Math Verification");

  // Test 4: Negative Cash Scenario
  // We'll add a massive immediate outflow to force negative cash, and re-run.
  await rawDb.payableEntry.create({
    data: {
      businessId: business.id,
      sourceType: "SUPPLIER_BILL",
      sourceId: "massive-bill",
      amount: 100000,
      dueDate: today,
      status: "OPEN"
    }
  });

  const negativeForecast = await CashForecastingEngine.generateForecast(business.id, 30, "DAILY");
  const negativeFinalPeriod = negativeForecast.periods[negativeForecast.periods.length - 1];
  if (negativeFinalPeriod.projectedBalance >= 0) {
    throw new Error(`TEST FAILED: Expected negative balance, got ${negativeFinalPeriod.projectedBalance}`);
  }
  console.log("✅ Test 4 Passed: Negative Cash Scenario Handled Correctly.");

  console.log("=== RC6.4 TREASURY & CASH FORECASTING SANDBOX VALIDATION COMPLETE ===");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await rawDb.$disconnect();
  });

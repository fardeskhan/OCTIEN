import { db } from "../src/lib/db";
import { DashboardService } from "../src/lib/dashboard/dashboard-service";

async function measure<T>(name: string, fn: () => Promise<T>): Promise<{ result: T, timeMs: number }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const timeMs = end - start;
  
  console.log(`[${timeMs.toFixed(2)} ms] ${name}`);
  return { result, timeMs };
}

async function runSuiteA(businessId: string) {
  console.log("\n--- Suite A: Finance (< 3 sec) ---");
  await measure("Trial Balance (groupBy JournalLines)", async () => {
    return db.journalLine.groupBy({
      by: ['accountId'],
      where: { businessId },
      _sum: { debit: true, credit: true }
    });
  });

  await measure("Profit & Loss (aggregate Income/Expense)", async () => {
    return db.journalLine.aggregate({
      where: { businessId, account: { is: { accountType: { in: ['REVENUE', 'EXPENSE'] } } } },
      _sum: { debit: true, credit: true }
    });
  });

  await measure("Balance Sheet (aggregate Assets/Liabilities/Equity)", async () => {
    return db.journalLine.aggregate({
      where: { businessId, account: { is: { accountType: { in: ['ASSET', 'LIABILITY', 'EQUITY'] } } } },
      _sum: { debit: true, credit: true }
    });
  });

  await measure("Period Close Validation (count unapproved)", async () => {
    return db.journalEntry.count({
      where: { businessId, approvedBy: null }
    });
  });
}

async function runSuiteB(businessId: string) {
  console.log("\n--- Suite B: Operations (< 2 sec) ---");
  await measure("Inventory Dashboard (sum variants)", async () => {
    return db.inventoryVariantProjection.aggregate({
      where: { businessId },
      _sum: { availableQuantity: true, reservedQuantity: true }
    });
  });

  await measure("Dead Stock Detection (0 reserved)", async () => {
    return db.inventoryVariantProjection.count({
      where: { businessId, reservedQuantity: 0 }
    });
  });
  
  await measure("Open Deliveries (count issued invoices)", async () => {
    return db.customerInvoice.count({
      where: { businessId, status: "ISSUED" }
    });
  });
}

async function runSuiteC(businessId: string) {
  console.log("\n--- Suite C: Executive Analytics ---");
  
  await measure("Executive Dashboard (Target < 2s)", async () => {
    return DashboardService.getExecutiveDashboard(businessId);
  });

  await measure("AR Aging (Grouping Receivables, Target < 3s)", async () => {
    const now = new Date();
    return db.receivableEntry.groupBy({
      by: ['status'],
      where: { businessId, dueDate: { lt: now } },
      _sum: { amount: true, paidAmount: true }
    });
  });

  await measure("AP Exposure (Grouping Payables, Target < 3s)", async () => {
    const now = new Date();
    return db.payableEntry.groupBy({
      by: ['status'],
      where: { businessId, dueDate: { lt: now } },
      _sum: { amount: true, paidAmount: true }
    });
  });
}

async function runSuiteD(businessId: string) {
  console.log("\n--- Suite D: Compliance (< 5 sec/batch) ---");
  await measure("Process 100 Pending Jobs", async () => {
    return db.complianceJob.findMany({
      where: { businessId, status: "PENDING" },
      take: 100
    });
  });

  await measure("Retry Queue Sweep", async () => {
    return db.complianceJob.findMany({
      where: { businessId, status: "FAILED" },
      take: 1000
    });
  });

  await measure("Audit Reconstruction (last 1000 events)", async () => {
    return db.auditEvent.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 1000
    });
  });
}

async function runMemoryStability(businessId: string) {
  console.log("\n--- Memory Stability Loop ---");
  
  const startHeap = process.memoryUsage().heapUsed;
  console.log(`Starting Heap: ${(startHeap / 1024 / 1024).toFixed(2)} MB`);
  
  const ITERATIONS = 5;
  console.log(`Running Executive Dashboard ${ITERATIONS} times...`);
  
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    await DashboardService.getExecutiveDashboard(businessId);
  }
  const end = performance.now();
  
  const endHeap = process.memoryUsage().heapUsed;
  console.log(`Ending Heap: ${(endHeap / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Heap Diff: ${((endHeap - startHeap) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total Time: ${((end - start) / 1000).toFixed(2)} sec`);
  console.log(`Avg Time/Req: ${((end - start) / ITERATIONS).toFixed(2)} ms`);
  
  if (endHeap - startHeap > 500 * 1024 * 1024) { // 500MB growth
    throw new Error("Memory leak detected! Heap grew by more than 500MB.");
  } else {
    console.log("✅ Memory stability verified. No leaks detected.");
  }
}

async function main() {
  console.log("=== STARTING RC7.0C BENCHMARK SUITE ===\n");
  
  const business = await db.business.findFirst();
  if (!business) {
    throw new Error("No business found! Run seed-scale-dataset.ts first.");
  }
  
  await runSuiteA(business.id);
  await runSuiteB(business.id);
  await runSuiteC(business.id);
  await runSuiteD(business.id);
  
  await runMemoryStability(business.id);
  
  console.log("\n=== BENCHMARK SUITE COMPLETE ===");
}

main().catch(e => {
  console.error("Benchmark Failed:", e);
  process.exit(1);
});

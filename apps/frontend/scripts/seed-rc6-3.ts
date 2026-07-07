import { PrismaClient } from "@prisma/client";
import { CustomerPaymentService } from "../src/lib/ar/customer-payment-service";
import { CustomerLedgerService } from "../src/lib/ar/customer-ledger-service";
import { ARAgingService } from "../src/lib/ar/ar-aging-service";
import { CustomerCreditReportService } from "../src/lib/ar/customer-credit-report-service";
import { CollectionsEngine } from "../src/lib/ar/collections-engine";
import { Decimal } from "@prisma/client/runtime/library";

const rawDb = new PrismaClient();

async function main() {
  console.log("=== STARTING RC6.3 AR & COLLECTIONS SANDBOX VALIDATION ===");

  // Cleanup for idempotency
  await rawDb.customerPaymentAllocation.deleteMany({ where: { businessId: "biz-rc63" } });
  await rawDb.customerPayment.deleteMany({ where: { businessId: "biz-rc63" } });
  await rawDb.receivableEntry.deleteMany({ where: { businessId: "biz-rc63" } });
  await rawDb.customerInvoice.deleteMany({ where: { businessId: "biz-rc63" } });

  // 1. Setup Base Data
  await rawDb.tenant.upsert({
    where: { id: "ten-rc63" },
    update: {},
    create: { id: "ten-rc63", name: "AR Test Tenant", slug: "ten-rc63" }
  });

  await rawDb.businessType.upsert({
    where: { name: "AR Test Corp Type" },
    update: {},
    create: { id: "type-rc63", name: "AR Test Corp Type" }
  });

  const business = await rawDb.business.upsert({
    where: { slug: "biz-rc63" },
    update: { businessTypeId: "type-rc63" },
    create: { 
      id: "biz-rc63", 
      name: "AR Sandbox Corp", 
      slug: "biz-rc63", 
      tenantId: "ten-rc63", 
      businessTypeId: "type-rc63",
      fiscalYearStartMonth: 4 
    }
  });

  const currency = await rawDb.currency.upsert({
    where: { code: "INR" },
    update: {},
    create: { code: "INR", name: "Indian Rupee", symbol: "₹", businessId: business.id }
  });

  const customer = await rawDb.customer.upsert({
    where: { businessId_code: { businessId: business.id, code: "CUST-MEGA" } },
    update: {},
    create: {
      businessId: business.id,
      code: "CUST-MEGA",
      name: "Megacorp Ltd"
    }
  });

  // Create Invoices & Receivables manually with specific due dates to test aging
  const today = new Date();
  
  const createInvoiceAndReceivable = async (code: string, amount: number, dueDaysAgo: number) => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() - dueDaysAgo);
    
    const inv = await rawDb.customerInvoice.create({
      data: {
        businessId: business.id,
        code,
        customerId: customer.id,
        currencyId: currency.id,
        totalAmount: amount,
        remainingAmount: amount,
        status: "ISSUED",
        collectionStatus: "CURRENT",
        sourceType: "MANUAL",
        sourceId: `manual-${code}`,
        createdAt: dueDate // using dueDate as createdAt roughly
      }
    });

    const rec = await rawDb.receivableEntry.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        sourceType: "CUSTOMER_INVOICE",
        sourceId: inv.id,
        amount: amount,
        dueDate: dueDate,
        status: "OPEN"
      }
    });

    return { inv, rec };
  };

  // 1. Current (due today/future)
  const iCurrent = await createInvoiceAndReceivable("INV-CURR", 1000, -5); 
  // 2. 1-30 Days Overdue (15 days overdue)
  const i30 = await createInvoiceAndReceivable("INV-30", 2000, 15);
  // 3. 31-60 Days Overdue (45 days overdue)
  const i60 = await createInvoiceAndReceivable("INV-60", 3000, 45);
  // 4. 61-90 Days Overdue (75 days overdue)
  const i90 = await createInvoiceAndReceivable("INV-90", 4000, 75);
  // 5. 90+ Days Overdue (100 days overdue)
  const i90Plus = await createInvoiceAndReceivable("INV-90P", 5000, 100);

  // 6. Another customer with a credit balance
  const customer2 = await rawDb.customer.upsert({
    where: { businessId_code: { businessId: business.id, code: "CUST-ADV" } },
    update: {},
    create: { businessId: business.id, code: "CUST-ADV", name: "Advance Corp" }
  });
  const iAdvance = await createInvoiceAndReceivable("INV-ADV", 1000, 0);

  console.log("✓ Base Data Seeded.");

  // TEST 1: Overpayment Handling (Leaves unallocatedAmount)
  const payment = await CustomerPaymentService.receivePayment({
    businessId: business.id,
    customerId: customer2.id,
    amount: 1500, // Pays 1500 for a 1000 invoice
    currencyId: currency.id,
    paymentDate: new Date()
  });

  await CustomerPaymentService.allocatePayment(payment.id, iAdvance.rec.id, 1000);
  
  const updatedPayment = await rawDb.customerPayment.findUnique({ where: { id: payment.id } });
  if (Number(updatedPayment?.unallocatedAmount) !== 500) {
    throw new Error(`TEST 1 FAILED: Expected 500 unallocated, got ${updatedPayment?.unallocatedAmount}`);
  }
  
  const updatedRec = await rawDb.receivableEntry.findUnique({ where: { id: iAdvance.rec.id } });
  if (updatedRec?.status !== "CLOSED") {
    throw new Error(`TEST 1 FAILED: Expected Receivable to be CLOSED, got ${updatedRec?.status}`);
  }
  console.log("✅ Test 1 Passed: Overpayment Handling (Leaves unallocatedAmount)");

  // TEST 2: Customer Credit Report
  const creditReport = await CustomerCreditReportService.generate(business.id);
  if (creditReport.length !== 1 || creditReport[0].creditBalance !== 500 || creditReport[0].customerId !== customer2.id) {
    throw new Error("TEST 2 FAILED: Customer Credit Report did not reflect the 500 unallocated correctly.");
  }
  console.log("✅ Test 2 Passed: Customer Credit Report generated correctly.");

  // TEST 3: AR Aging Buckets
  const agingReport = await ARAgingService.generateAgingReport(business.id, new Date());
  const c1Aging = agingReport.find(a => a.customerId === customer.id);
  
  if (!c1Aging) throw new Error("TEST 3 FAILED: Customer 1 missing from aging report");
  if (c1Aging.current !== 1000) throw new Error(`TEST 3 FAILED: Expected Current=1000, got ${c1Aging.current}`);
  if (c1Aging.days1_30 !== 2000) throw new Error(`TEST 3 FAILED: Expected 1-30=2000, got ${c1Aging.days1_30}`);
  if (c1Aging.days31_60 !== 3000) throw new Error(`TEST 3 FAILED: Expected 31-60=3000, got ${c1Aging.days31_60}`);
  if (c1Aging.days61_90 !== 4000) throw new Error(`TEST 3 FAILED: Expected 61-90=4000, got ${c1Aging.days61_90}`);
  if (c1Aging.days90Plus !== 5000) throw new Error(`TEST 3 FAILED: Expected 90+=5000, got ${c1Aging.days90Plus}`);
  if (c1Aging.total !== 15000) throw new Error(`TEST 3 FAILED: Expected Total=15000, got ${c1Aging.total}`);
  console.log("✅ Test 3 Passed: AR Aging Buckets Calculated Correctly.");

  // TEST 4: Collections Engine Status Transitions
  const log = await CollectionsEngine.evaluateCollectionStatuses(business.id, new Date());
  
  const updatedInv30 = await rawDb.customerInvoice.findUnique({ where: { id: i30.inv.id } });
  const updatedInv60 = await rawDb.customerInvoice.findUnique({ where: { id: i60.inv.id } });
  const updatedInv90Plus = await rawDb.customerInvoice.findUnique({ where: { id: i90Plus.inv.id } });

  if (updatedInv30?.collectionStatus !== "OVERDUE") throw new Error(`TEST 4 FAILED: Expected OVERDUE, got ${updatedInv30?.collectionStatus}`);
  if (updatedInv60?.collectionStatus !== "REMINDER_SENT") throw new Error(`TEST 4 FAILED: Expected REMINDER_SENT, got ${updatedInv60?.collectionStatus}`);
  if (updatedInv90Plus?.collectionStatus !== "ESCALATED") throw new Error(`TEST 4 FAILED: Expected ESCALATED, got ${updatedInv90Plus?.collectionStatus}`);
  console.log("✅ Test 4 Passed: Collections Engine successfully transitioned statuses.");

  // TEST 5: Customer Ledger Balance
  const balance = await CustomerLedgerService.getCustomerBalance(customer2.id);
  if (balance.outstandingReceivables !== 0) throw new Error(`TEST 5 FAILED: Expected 0 outstanding, got ${balance.outstandingReceivables}`);
  if (balance.availableCredits !== 500) throw new Error(`TEST 5 FAILED: Expected 500 available credits, got ${balance.availableCredits}`);
  if (balance.netBalance !== -500) throw new Error(`TEST 5 FAILED: Expected -500 net balance, got ${balance.netBalance}`);
  console.log("✅ Test 5 Passed: Customer Ledger Balance Calculated Correctly.");

  console.log("=== RC6.3 AR & COLLECTIONS SANDBOX VALIDATION COMPLETE ===");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await rawDb.$disconnect();
  });

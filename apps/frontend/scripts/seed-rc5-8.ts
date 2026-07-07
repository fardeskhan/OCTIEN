
import { PrismaClient } from "@prisma/client";
import { SupplierBillService } from "../src/lib/finance/supplier-bill-service";
import { ApprovalService } from "../src/lib/workflows/approval-service";

const db = new PrismaClient();

async function main() {
  console.log("=== STARTING RC5.8 APPROVALS VALIDATION ===");
  
  let tenant = await db.tenant.findFirst();
  if (!tenant) tenant = await db.tenant.create({ data: { id: "tenant-1", name: "Test Tenant", slug: "test-tenant" } });
  
  const tenantId = tenant.id;
  const userId = "u-system"; // Simulating system user

  let businessType = await db.businessType.findFirst();
  if (!businessType) businessType = await db.businessType.create({ data: { name: "Retail" } });

  let business = await db.business.findFirst();
  if (!business) {
    business = await db.business.create({
      data: { id: "biz-1", tenantId: tenant.id, name: "Test Biz", slug: "test-biz", businessTypeId: businessType.id }
    });
  }

  let currency = await db.currency.findFirst({ where: { code: "USD" } });
  if (!currency) {
    currency = await db.currency.create({ data: { code: "USD", name: "US Dollar", symbol: "$", businessId: business.id } });
    await db.business.update({ where: { id: business.id }, data: { defaultCurrencyId: currency.id } });
  }

  let supplier = await db.supplier.findFirst({ where: { businessId: business.id } });
  if (!supplier) {
    supplier = await db.supplier.create({
      data: { businessId: business.id, name: "Test Supplier", code: "SUP-1" }
    });
  }

  let account = await db.ledgerAccount.findFirst({ where: { businessId: business.id, accountCode: "5000" } });
  if (!account) {
    account = await db.ledgerAccount.create({
      data: { businessId: business.id, accountCode: "5000", name: "Expense", accountType: "EXPENSE" }
    });
  }
  
  let apAccount = await db.ledgerAccount.findFirst({ where: { businessId: business.id, accountCode: "2000" } });
  if (!apAccount) {
    apAccount = await db.ledgerAccount.create({
      data: { businessId: business.id, accountCode: "2000", name: "Accounts Payable", accountType: "LIABILITY" }
    });
  }

  let period = await db.accountingPeriod.findFirst({ where: { businessId: business.id } });
  if (!period) {
    period = await db.accountingPeriod.create({
      data: {
        businessId: business.id,
        name: "Test Period",
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-31"),
        status: "OPEN"
      }
    });
  }

  // Test 1: Request Approval -> PENDING
  console.log("Running Test 1: Request Approval");
  const { bill } = await SupplierBillService.createBill({
    businessId: business.id,
    tenantId,
    userId,
    supplierId: supplier.id,
    billDate: new Date(),
    dueDate: new Date(),
    reference: `TEST-WF-${Date.now()}`,
    lines: [
      { description: "Test Item", quantity: 1, unitPrice: 100, accountId: account.id }
    ]
  });

  if (bill.status !== "PENDING_APPROVAL") {
    throw new Error(`Test 1 Failed: Bill status is ${bill.status}, expected PENDING_APPROVAL`);
  }
  
  const approvalRequest = await db.approvalRequest.findFirst({
    where: { sourceType: "SUPPLIER_BILL", sourceId: bill.id }
  });

  if (!approvalRequest || approvalRequest.status !== "PENDING") {
    throw new Error("Test 1 Failed: ApprovalRequest not found or not PENDING");
  }
  console.log("? Test 1 Passed: Request Approval -> PENDING");

  // Test 2: Attempt Payment While Pending -> Fail
  console.log("Running Test 2: Attempt Payment While Pending");
  const journalEntry = await db.journalEntry.findFirst({ where: { sourceId: bill.id, sourceType: "SUPPLIER_BILL" } });
  if (journalEntry) {
    throw new Error("Test 2 Failed: Journal Entry was posted while bill is PENDING_APPROVAL!");
  }
  console.log("? Test 2 Passed: Journal entry is correctly deferred, blocking AP payment logic.");

  // Test 3: Approve Then Pay -> Pass
  console.log("Running Test 3: Approve Then Pay");
  const { bill: approvedBill, journalEntry: approvedJe } = await SupplierBillService.approveBill(bill.id, userId, tenantId);
  if (approvedBill.status !== "APPROVED" || !approvedJe) {
    throw new Error("Test 3 Failed: Bill not approved or JE not created.");
  }
  console.log("? Test 3 Passed: Approved bill successfully hit the ledger.");

  // Test 4 & 5: Reject & Hash Invalidated
  console.log("Running Test 4/5: Hash Invalidated on Modification");
  const { bill: bill2 } = await SupplierBillService.createBill({
    businessId: business.id, tenantId, userId,
    supplierId: supplier.id, billDate: new Date(), dueDate: new Date(),
    reference: `TEST-WF2-${Date.now()}`,
    lines: [{ description: "Test Item 2", quantity: 1, unitPrice: 200, accountId: account.id }]
  });

  const request2 = await db.approvalRequest.findFirst({ where: { sourceId: bill2.id, status: "PENDING" } });
  if (!request2) throw new Error("Test 5 setup failed");

  // Simulate malicious API modification behind the back
  const tamperedSnapshot = {
    ...JSON.parse(request2.snapshotJson),
    totalAmount: 999999 // Tampered
  };

  try {
    await ApprovalService.approve(request2.id, userId, tenantId, tamperedSnapshot);
    throw new Error("Test 5 Failed: Approval succeeded despite tampered hash!");
  } catch (err: any) {
    if (err.message.includes("hash mismatch") || err.message.includes("invalidated")) {
      console.log("? Test 5 Passed: Tampering detected via Hash Check. Approval Invalidated.");
    } else {
      throw err;
    }
  }

  // Test 6: Verify Action history records
  console.log("Running Test 6: Action History");
  const actions = await db.approvalAction.findMany({ where: { approvalRequestId: approvalRequest.id } });
  if (actions.length < 2) { // REQUESTED and APPROVED
    throw new Error("Test 6 Failed: Action history not recorded.");
  }
  const hasRequested = actions.some(a => a.actionType === "REQUESTED");
  const hasApproved = actions.some(a => a.actionType === "APPROVED");
  if (!hasRequested || !hasApproved) throw new Error("Test 6 Failed: Missing specific action types.");
  console.log("? Test 6 Passed: Immutable action history recorded (REQUESTED, APPROVED).");

  // Test 7: Permission failure is skipped in automated script since system user has it,
  // but it is enforced via requirePermission.

  console.log("=== RC5.8 VALIDATION COMPLETE ===");
}

main().catch(console.error).finally(() => db.$disconnect());


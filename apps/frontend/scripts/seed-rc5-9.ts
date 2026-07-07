
import { PrismaClient } from "@prisma/client";
import { SupplierBillService } from "../src/lib/finance/supplier-bill-service";
import { AuditService } from "../src/lib/audit/audit-service";
import { db } from "../src/lib/db";

const rawDb = new PrismaClient(); // raw client to bypass extension for setup if needed, but we use the main db for tests

async function main() {
  console.log("=== STARTING RC5.9 AUDIT CENTER VALIDATION ===");

  // 1. Setup Data
  let business = await rawDb.business.findFirst();
  if (!business) {
    business = await rawDb.business.create({
      data: { name: "Audit Corp", slug: "audit-corp" }
    });
  }

  let currency = await rawDb.currency.findFirst({ where: { code: "USD" } });
  if (!currency) {
    currency = await rawDb.currency.create({
      data: { code: "USD", name: "US Dollar", symbol: "$" }
    });
  }
  await rawDb.business.update({ where: { id: business.id }, data: { defaultCurrencyId: currency.id } });

  let supplier = await rawDb.supplier.findFirst({ where: { businessId: business.id } });
  if (!supplier) {
    supplier = await rawDb.supplier.create({
      data: { businessId: business.id, name: "Secure Supplier", code: "SUPP-02" }
    });
  }

  let expenseAccount = await rawDb.ledgerAccount.findFirst({ where: { businessId: business.id, accountCode: "5000" } });
  if (!expenseAccount) {
    expenseAccount = await rawDb.ledgerAccount.create({
      data: { businessId: business.id, accountCode: "5000", name: "Expense", accountType: "EXPENSE" }
    });
  }
  
  let apAccount = await rawDb.ledgerAccount.findFirst({ where: { businessId: business.id, accountCode: "2000" } });
  if (!apAccount) {
    apAccount = await rawDb.ledgerAccount.create({
      data: { businessId: business.id, accountCode: "2000", name: "Accounts Payable", accountType: "LIABILITY" }
    });
  }

  let period = await rawDb.accountingPeriod.findFirst({ where: { businessId: business.id, status: "OPEN" } });
  if (!period) {
    period = await rawDb.accountingPeriod.create({
      data: {
        businessId: business.id,
        name: "Test Period",
        startDate: new Date("2020-01-01"),
        endDate: new Date("2030-12-31"),
        status: "OPEN"
      }
    });
  }

  // Test 1: Create Bill -> Audit Event Created
  console.log("Running Test 1: Create Bill -> Audit Event Created");
  const { bill } = await SupplierBillService.createBill({
    businessId: business.id,
    tenantId: "tenant-1",
    userId: "user-1",
    supplierId: supplier.id,
    billDate: new Date(),
    dueDate: new Date(),
    reference: `INV-999-${Date.now()}`,
    lines: [
      { description: "Test Item", quantity: 10, unitPrice: 50, accountId: expenseAccount.id }
    ]
  });

  const createdEvents = await AuditService.getEntityTimeline(business.id, "SUPPLIER_BILL", bill.id);
  if (createdEvents.length !== 1 || createdEvents[0].eventType !== "CREATED") {
    throw new Error("Test 1 Failed: CREATED audit event not found.");
  }
  const correlationId = createdEvents[0].correlationId;
  console.log("✅ Test 1 Passed");

  // Create a separate bill for Update & Delete tests so we don't invalidate the first bill's hash
  const { bill: altBill } = await SupplierBillService.createBill({
    businessId: business.id,
    tenantId: "tenant-1",
    userId: "user-1",
    supplierId: supplier.id,
    billDate: new Date(),
    dueDate: new Date(),
    reference: `INV-ALT-${Date.now()}`,
    lines: [
      { description: "Alt Item", quantity: 1, unitPrice: 100, accountId: expenseAccount.id }
    ]
  });

  // Test 2: Update Bill -> Before/After Snapshot Stored
  console.log("Running Test 2: Update Bill");
  await SupplierBillService.updateBillAmount(altBill.id, 600, "user-1", "tenant-1");
  const updateEvents = await rawDb.auditEvent.findMany({ where: { entityId: altBill.id, eventType: "UPDATED" } });
  if (updateEvents.length !== 1 || !(updateEvents[0].afterSnapshot as any).totalAmount) {
    throw new Error("Test 2 Failed: UPDATED audit event not found or snapshot missing.");
  }
  console.log("✅ Test 2 Passed");

  // Test 3: Approve Bill -> Approval Audit Event Created
  // Test 4: Post Journal -> Journal Audit Event Created
  console.log("Running Test 3 & 4: Approve Bill & Post Journal");
  await SupplierBillService.approveBill(bill.id, "user-2", "tenant-1");

  const approvalRequest = await rawDb.approvalRequest.findFirst({ where: { sourceId: bill.id } });
  const approvalEvents = await rawDb.auditEvent.findMany({ where: { entityId: approvalRequest!.id, eventType: "APPROVED" } });
  if (approvalEvents.length !== 1 || approvalEvents[0].correlationId !== correlationId) {
    throw new Error("Test 3 Failed: Approval Audit Event not found or correlationId mismatch.");
  }
  console.log("✅ Test 3 Passed");

  const journalEntry = await rawDb.journalEntry.findFirst({ where: { sourceId: bill.id } });
  const journalEvents = await rawDb.auditEvent.findMany({ where: { entityId: journalEntry!.id, eventType: "JOURNAL_POSTED" } });
  if (journalEvents.length !== 1 || journalEvents[0].correlationId !== correlationId) {
    throw new Error("Test 4 Failed: Journal Audit Event not found or correlationId mismatch.");
  }
  console.log("✅ Test 4 Passed");

  // Test 5: Attempt Delete -> Audit Event Created
  console.log("Running Test 5: Soft Delete Bill");
  await SupplierBillService.deleteBill(altBill.id, "user-1", "tenant-1");
  const deleteEvents = await rawDb.auditEvent.findMany({ where: { entityId: altBill.id, eventType: "DELETED" } });
  if (deleteEvents.length !== 1) {
    throw new Error("Test 5 Failed: DELETED audit event not found.");
  }
  console.log("✅ Test 5 Passed");

  // Test 6 & 7: Timeline Reconstruction & Workflow Timeline
  console.log("Running Test 6 & 7: Workflow Timeline");
  const workflowEvents = await AuditService.getWorkflowTimeline(business.id, correlationId);
  // We expect:
  // - CREATED (Supplier Bill)
  // - APPROVAL_REQUESTED (Approval)
  // - APPROVED (Approval)
  // - JOURNAL_POSTED (Journal)
  if (workflowEvents.length < 4) {
    throw new Error(`Test 6/7 Failed: Workflow timeline incomplete. Found ${workflowEvents.length} events.`);
  }
  console.log("✅ Test 6 & 7 Passed (Cross-domain sequence correlated successfully)");

  // Test 8: Audit Event Modification Attempt
  console.log("Running Test 8: Append-Only DB Constraint");
  try {
    const event = workflowEvents[0];
    await db.auditEvent.update({
      where: { id: event.id },
      data: { performedBy: "HACKER" }
    });
    throw new Error("Test 8 Failed: Was able to update an audit event!");
  } catch (err: any) {
    if (err.message.includes("append-only")) {
      console.log("? Test 8 Passed: Append-only constraint successfully blocked modification.");
    } else {
      throw err;
    }
  }

  console.log("=== RC5.9 VALIDATION COMPLETE ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


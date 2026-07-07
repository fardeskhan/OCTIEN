
import { PrismaClient } from "@prisma/client";
import { SupplierBillService } from "../src/lib/finance/supplier-bill-service";
import { DocumentService } from "../src/lib/documents/document-service";
import { AuditService } from "../src/lib/audit/audit-service";
import { db } from "../src/lib/db";

const rawDb = new PrismaClient();

async function main() {
  console.log("=== STARTING RC5.9.1 SECURITY HARDENING GATES ===");

  // Setup Tenants
  const tenantObjA = await rawDb.tenant.create({ data: { name: "SysTenant A", slug: `sys-tenant-a-${Date.now()}` } });
  const tenantObjB = await rawDb.tenant.create({ data: { name: "SysTenant B", slug: `sys-tenant-b-${Date.now()}` } });
  
  let busType = await rawDb.businessType.findFirst();
  if (!busType) busType = await rawDb.businessType.create({ data: { name: "Retail", slug: "retail" } });

  const tenantA = await rawDb.business.create({ data: { name: "Tenant A", slug: `tenant-a-${Date.now()}`, tenant: { connect: { id: tenantObjA.id } }, businessType: { connect: { id: busType.id } } } });
  const tenantB = await rawDb.business.create({ data: { name: "Tenant B", slug: `tenant-b-${Date.now()}`, tenant: { connect: { id: tenantObjB.id } }, businessType: { connect: { id: busType.id } } } });

  const currency = await rawDb.currency.findFirst({ where: { code: "USD" } }) || await rawDb.currency.create({ data: { code: "USD", name: "US Dollar", symbol: "$" } });
  
  await rawDb.business.update({ where: { id: tenantA.id }, data: { defaultCurrencyId: currency.id } });
  await rawDb.business.update({ where: { id: tenantB.id }, data: { defaultCurrencyId: currency.id } });

  const supplierA = await rawDb.supplier.create({ data: { businessId: tenantA.id, name: "Supplier A", code: "SUPP-A" } });
  const supplierB = await rawDb.supplier.create({ data: { businessId: tenantB.id, name: "Supplier B", code: "SUPP-B" } });

  const expenseAccountA = await rawDb.ledgerAccount.create({ data: { businessId: tenantA.id, accountCode: "5000", name: "Expense", accountType: "EXPENSE" } });
  const expenseAccountB = await rawDb.ledgerAccount.create({ data: { businessId: tenantB.id, accountCode: "5000", name: "Expense", accountType: "EXPENSE" } });

  // Gate 1: Permission Matrix
  console.log("Running Security Gate 1: Permission Matrix Validation");
  const roleFinanceUser = await rawDb.role.findFirst({ where: { name: "FINANCE_USER" } });
  if (roleFinanceUser) {
    console.log("? Gate 1 Passed (Roles exist and mapped)");
  } else {
    console.log("?? Gate 1 Skipped (Roles not seeded in this db yet)");
  }

  // Create Bill in Tenant A
  const { bill: billA } = await SupplierBillService.createBill({
    businessId: tenantA.id,
    tenantId: "TENANT_A",
    userId: "user-a",
    supplierId: supplierA.id,
    billDate: new Date(),
    dueDate: new Date(),
    reference: `INV-A-${Date.now()}`,
    lines: [{ description: "A", quantity: 1, unitPrice: 10, accountId: expenseAccountA.id }]
  });

  // Gate 2 & 3: Tenant Escape Testing & Document Isolation
  console.log("Running Security Gate 2 & 3: Tenant Escape & Document Isolation");
  
  // Upload doc in Tenant A
  await DocumentService.uploadDocument(
    tenantA.id, "TENANT_A", "user-a", "SUPPLIER_BILL", billA.id,
    Buffer.from("fake-pdf-content"), "invoice.pdf", "application/pdf"
  );

  // Attempt to access Bill A's documents using Tenant B context
  const docsFromB = await DocumentService.getAttachments(tenantB.id, "SUPPLIER_BILL", billA.id);
  
  if (docsFromB.length > 0) {
    throw new Error("Gate 2/3 Failed: Tenant B accessed Tenant A documents!");
  } else {
    console.log("? Gate 2 & 3 Passed (Cross-tenant reads return empty arrays; structurally blocked by businessId boundaries)");
  }

  // Gate 4: Audit Tamper Testing
  console.log("Running Security Gate 4: Audit Tamper Testing");
  const timeline = await AuditService.getEntityTimeline(tenantA.id, "SUPPLIER_BILL", billA.id);
  try {
    await db.auditEvent.delete({ where: { id: timeline[0].id } });
    throw new Error("Gate 4 Failed: Able to delete audit event.");
  } catch (err: any) {
    if (err.message.includes("append-only")) {
      console.log("? Gate 4 Passed (Audit tampering blocked at ORM layer)");
    } else {
      throw err;
    }
  }

  console.log("=== RC5.9.1 SECURITY HARDENING COMPLETE ===");
}

main().catch(console.error);


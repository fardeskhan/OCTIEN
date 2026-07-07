
import { PrismaClient } from "@prisma/client";
import { ComplianceService } from "../src/lib/compliance/compliance-service";
import { DocumentService } from "../src/lib/documents/document-service";
import { AuditService } from "../src/lib/audit/audit-service";

const rawDb = new PrismaClient();

async function main() {
  console.log("=== STARTING RC6.0A COMPLIANCE VALIDATION ===");

  // Setup
  const tenant = await rawDb.tenant.findFirst() || await rawDb.tenant.create({ data: { name: "SysTenant", slug: `sys-tenant-${Date.now()}` } });
  
  let busType = await rawDb.businessType.findFirst();
  if (!busType) busType = await rawDb.businessType.create({ data: { name: "Retail", slug: "retail" } });

  let business = await rawDb.business.findFirst();
  if (!business) {
    business = await rawDb.business.create({
      data: { name: "Audit Corp", slug: `audit-corp-${Date.now()}`, tenantId: tenant.id, businessTypeId: busType.id }
    });
  }

  // Create Mock Invoices
  const invSuccess = `INV-${Date.now()}-OK`;
  const invFail = `INV-${Date.now()}-FAIL-IRN`;
  
  const ewbSuccess = `EWB-${Date.now()}-OK`;
  const ewbFail = `EWB-${Date.now()}-FAIL-EWAY`;

  const correlationId = `CORR-${Date.now()}`;

  // We need actual CustomerInvoice IDs for FK for EWayBill
  
  const currency = await rawDb.currency.findFirst({ where: { code: "USD" } }) || await rawDb.currency.create({ data: { code: "USD", name: "US Dollar", symbol: "$" } });
  
  const customer = await rawDb.customer.create({
    data: { businessId: business.id, name: "Customer", code: `CUST1-${Date.now()}` }
  });

  const invObjOk = await rawDb.customerInvoice.create({
    data: {
      id: invSuccess,
      code: invSuccess,
      business: { connect: { id: business.id } },
      customer: { connect: { id: customer.id } },
      currency: { connect: { id: currency.id } },
      status: "ISSUED",
      totalAmount: 100,
      remainingAmount: 100,
      sourceType: "MANUAL",
      sourceId: invSuccess
    }
  });

  const invObjFail = await rawDb.customerInvoice.create({
    data: {
      id: invFail,
      code: invFail,
      business: { connect: { id: business.id } },
      customer: { connect: { id: customer.id } },
      currency: { connect: { id: currency.id } },
      status: "ISSUED",
      totalAmount: 100,
      remainingAmount: 100,
      sourceType: "MANUAL",
      sourceId: invFail
    }
  });

  // Test 1: Mock IRN Success
  console.log("Running Test 1: Mock IRN Success");
  const einvOk = await ComplianceService.processInvoiceCompliance(
    business.id,
    tenant.id,
    invSuccess,
    "user-1",
    correlationId,
    { reference: invSuccess }
  );
  if (einvOk.status !== "GENERATED" || !einvOk.irn) throw new Error("Test 1 Failed: Status not GENERATED");
  console.log("? Test 1 Passed");

  // Test 2: Mock IRN Failure (Non-blocking)
  console.log("Running Test 2: Mock IRN Failure (ADR-COMP-002)");
  const einvFail = await ComplianceService.processInvoiceCompliance(
    business.id,
    tenant.id,
    invFail,
    "user-1",
    correlationId,
    { reference: invFail }
  );
  if (einvFail.status !== "FAILED" || !einvFail.lastError) throw new Error("Test 2 Failed: Status not FAILED");
  console.log("? Test 2 Passed");

  // Setup EWayBill record for Test 3 & 7
  const ewayObjOk = await rawDb.eWayBill.create({
    data: { businessId: business.id, ewbNumber: ewbSuccess, invoiceId: invSuccess, status: "PENDING" }
  });
  const ewayObjFail = await rawDb.eWayBill.create({
    data: { businessId: business.id, ewbNumber: ewbFail, invoiceId: invFail, status: "PENDING" }
  });

  // Test 3: Mock EWay Success
  console.log("Running Test 3: Mock EWay Success");
  const ewbOkResult = await ComplianceService.processEWayBillCompliance(
    business.id, tenant.id, ewayObjOk.id, "user-1", correlationId, { reference: ewbSuccess }
  );
  if (ewbOkResult.status !== "GENERATED") throw new Error("Test 3 Failed: Status not GENERATED");
  console.log("? Test 3 Passed");

  // Test 4: Document Attachments Created
  console.log("Running Test 4: Document Attachments Created");
  const irnDocs = await DocumentService.getAttachments(business.id, "E_INVOICE", einvOk.id);
  const ewayDocs = await DocumentService.getAttachments(business.id, "E_WAY_BILL", ewbOkResult.id);
  
  if (irnDocs.length !== 1 || ewayDocs.length !== 1) throw new Error("Test 4 Failed: Documents not attached properly");
  console.log("? Test 4 Passed");

  // Test 5: Audit Events Generated
  console.log("Running Test 5: Audit Events Generated");
  const irnAudit = await rawDb.auditEvent.findMany({ where: { entityId: einvOk.id, eventType: "IRN_GENERATED" } });
  const irnFailAudit = await rawDb.auditEvent.findMany({ where: { entityId: einvFail.id, eventType: "IRN_FAILED" } });
  if (irnAudit.length !== 1 || irnFailAudit.length !== 1) throw new Error("Test 5 Failed: Audit logs missing");
  console.log("? Test 5 Passed");

  // Test 6: Workflow Timeline Reconstruction
  console.log("Running Test 6: Workflow Timeline Reconstruction");
  const timeline = await AuditService.getWorkflowTimeline(business.id, correlationId);
  // We generated 1 OK IRN, 1 FAIL IRN, 1 OK EWay = 3 audit events linked to correlationId
  if (timeline.length < 3) throw new Error("Test 6 Failed: Timeline incomplete");
  console.log("? Test 6 Passed");

  // Test 7: Retry Failed Compliance Request
  console.log("Running Test 7: Retry Failed Compliance Request");
  const ewbFailResult1 = await ComplianceService.processEWayBillCompliance(
    business.id, tenant.id, ewayObjFail.id, "user-1", correlationId, { reference: ewbFail }
  );
  if (ewbFailResult1.generationAttempts !== 1) throw new Error("Test 7 Failed: Attempts should be 1");
  
  const ewbFailResult2 = await ComplianceService.processEWayBillCompliance(
    business.id, tenant.id, ewayObjFail.id, "user-1", correlationId, { reference: ewbFail }
  );
  if (ewbFailResult2.generationAttempts !== 2) throw new Error("Test 7 Failed: Attempts should be 2");
  console.log("? Test 7 Passed");

  console.log("=== RC6.0A VALIDATION COMPLETE ===");
}

main().catch(console.error);


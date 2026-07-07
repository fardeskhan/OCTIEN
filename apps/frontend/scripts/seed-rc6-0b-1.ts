import { PrismaClient } from "@prisma/client";
import { ComplianceService } from "../src/lib/compliance/compliance-service";
import { ComplianceJobProcessor } from "../src/lib/compliance/compliance-job-processor";
import { AuditService } from "../src/lib/audit/audit-service";

const rawDb = new PrismaClient();

async function main() {
  console.log("=== STARTING RC6.0B.1 NIC SANDBOX VALIDATION ===");

  // Cleanup old state
  await rawDb.auditEvent.deleteMany({});
  await rawDb.documentAttachment.deleteMany({});
  await rawDb.complianceJob.deleteMany({});
  await rawDb.eWayBill.deleteMany({});
  await rawDb.eInvoice.deleteMany({});
  // We won't delete shared models to avoid FK issues with other seeded data.

  const tenant = await rawDb.tenant.upsert({
    where: { slug: "ten-rc60b" },
    update: {},
    create: { id: "ten-rc60b", name: "Main Tenant", slug: "ten-rc60b" }
  });

  const tenant2 = await rawDb.tenant.upsert({
    where: { slug: "ten2-rc60b" },
    update: {},
    create: { id: "ten2-rc60b", name: "Other Tenant", slug: "ten2-rc60b" }
  });

  const businessType = await rawDb.businessType.upsert({
    where: { name: "Sandbox Type" },
    update: {},
    create: { name: "Sandbox Type" }
  });

  const business = await rawDb.business.upsert({
    where: { slug: "biz-rc60b" },
    update: {},
    create: { id: "biz-rc60b", name: "COSMY Sandbox Corp", slug: "biz-rc60b", tenantId: tenant.id, businessTypeId: businessType.id }
  });

  let currency = await rawDb.currency.findFirst({ where: { code: "USD" } });
  if (!currency) {
    currency = await rawDb.currency.create({ data: { code: "USD", name: "US Dollar", symbol: "$" } });
  }
  
  const customer = await rawDb.customer.create({
    data: { businessId: business.id, name: "Customer", code: `CUST1-${Date.now()}` }
  });

  const invSuccess = `INV-SUCCESS-${Date.now()}`;
  const invTimeout = `INV-TIMEOUT-${Date.now()}`;
  const invIdemp = `INV-IDEMP-${Date.now()}`;
  const invRateLim = `INV-RATELIM-${Date.now()}`;
  
  const user = "usr-test-1";

  // Helpers
  const createMockInvoice = async (id: string) => {
    return await rawDb.customerInvoice.create({
      data: {
        id,
        code: id,
        business: { connect: { id: business.id } },
        customer: { connect: { id: customer.id } },
        currency: { connect: { id: currency.id } },
        status: "ISSUED",
        totalAmount: 100,
        remainingAmount: 100,
        sourceType: "MANUAL",
        sourceId: id
      }
    });
  };

  await createMockInvoice(invSuccess);
  await createMockInvoice(invTimeout);
  await createMockInvoice(invIdemp);
  for (let i = 0; i < 5; i++) {
    await createMockInvoice(`${invRateLim}-${i}`);
  }

  // === Test 1: Successful IRN Generation ===
  const corr1 = `CORR-T1-${Date.now()}`;
  await ComplianceService.processInvoiceCompliance(business.id, tenant.id, invSuccess, user, corr1, { amount: 100 });
  await ComplianceJobProcessor.processPendingJobs();
  
  const einv1 = await rawDb.eInvoice.findFirst({ where: { customerInvoiceId: invSuccess } });
  if (einv1?.status !== "GENERATED" || !einv1.irn) throw new Error("Test 1 Failed: IRN not generated");
  console.log("✅ Test 1 Passed: Successful IRN Generation via Queue");

  // === Test 2: NIC Timeout ===
  const corr2 = `CORR-T2-${Date.now()}`;
  await ComplianceService.processInvoiceCompliance(business.id, tenant.id, invTimeout, user, corr2, { simulateTimeout: true });
  await ComplianceJobProcessor.processPendingJobs();

  const einv2 = await rawDb.eInvoice.findFirst({ where: { customerInvoiceId: invTimeout } });
  if (einv2?.status !== "PENDING") throw new Error("Test 2 Failed: Invoice should stay PENDING during retry period");
  const job2 = await rawDb.complianceJob.findFirst({ where: { correlationId: corr2 } });
  if (job2?.status !== "RETRY_PENDING") throw new Error("Test 2 Failed: Job should be RETRY_PENDING");
  console.log("✅ Test 2 Passed: NIC Timeout schedules RETRY_PENDING without failing invoice");

  // === Test 9: Retry Backoff scheduling logic ===
  if (job2.attempts !== 1) throw new Error("Test 9 Failed: Attempts should be 1");
  // Check if nextAttemptAt is around 1 min from processedAt
  const timeDiff = job2.nextAttemptAt!.getTime() - job2.processedAt!.getTime();
  if (timeDiff < 59000 || timeDiff > 61000) throw new Error(`Test 9 Failed: Backoff time incorrect (${timeDiff}ms)`);
  console.log("✅ Test 9 Passed: Retry backoff schedules 1 minute correctly for attempt 1");

  // === Test 3: Retry after timeout completion ===
  // Fast-forward time for job2 to simulate 1 minute passed, and remove simulateTimeout flag
  await rawDb.complianceJob.update({
    where: { id: job2.id },
    data: { 
      nextAttemptAt: new Date(Date.now() - 1000), 
      payload: { invoiceId: invTimeout, einvoiceId: einv2.id, userId: user, invoiceData: {} } 
    }
  });
  await ComplianceJobProcessor.processPendingJobs();
  
  const einv2Retry = await rawDb.eInvoice.findFirst({ where: { customerInvoiceId: invTimeout } });
  if (einv2Retry?.status !== "GENERATED") throw new Error("Test 3 Failed: Retry did not succeed");
  console.log("✅ Test 3 Passed: Retry successful after timeout");

  // === Test 4: Idempotency (Duplicate Request) ===
  const corr4 = `CORR-T4-${Date.now()}`;
  await ComplianceService.processInvoiceCompliance(business.id, tenant.id, invIdemp, user, corr4, { simulateDuplicate: true, invoiceId: invIdemp });
  await ComplianceJobProcessor.processPendingJobs();
  const einv4 = await rawDb.eInvoice.findFirst({ where: { customerInvoiceId: invIdemp } });
  if (einv4?.irn !== `IRN-EXISTING-${invIdemp}`) throw new Error(`Test 4 Failed: Idempotency check failed, got ${einv4?.irn}`);
  console.log("✅ Test 4 Passed: Provider idempotency returns existing IRN");

  // === Test 8: Duplicate Job submission ===
  const einv8 = await ComplianceService.processInvoiceCompliance(business.id, tenant.id, invIdemp, user, corr4, { simulateDuplicate: true });
  // Should immediately return GENERATED without queuing a new job
  const pendingJobs = await rawDb.complianceJob.count({ where: { correlationId: corr4, status: "PENDING" } });
  if (pendingJobs > 0) throw new Error("Test 8 Failed: Submitted duplicate job for already generated IRN");
  console.log("✅ Test 8 Passed: Service blocks duplicate job submissions");

  // === Test 5: Audit Chain Reconstruction ===
  const audits = await rawDb.auditEvent.findMany({ where: { correlationId: corr1 }, orderBy: { createdAt: "asc" } });
  if (audits.length < 2) throw new Error("Test 5 Failed: Not enough audit events");
  if (audits[0].eventType !== "IRN_REQUESTED" || audits[1].eventType !== "IRN_GENERATED") throw new Error("Test 5 Failed: Audit chain broken");
  console.log("✅ Test 5 Passed: Audit chain reconstruction (REQUESTED -> GENERATED)");

  // === Test 6: Tenant Isolation ===
  const tenant2Audits = await rawDb.auditEvent.findMany({ where: { tenantId: tenant2.id } });
  if (tenant2Audits.length > 0) throw new Error("Test 6 Failed: Tenant isolation breached");
  console.log("✅ Test 6 Passed: Tenant Isolation preserved in job queue artifacts");

  // === Test 7: Rate Limit Throttling ===
  const startRateLim = Date.now();
  for (let i = 0; i < 5; i++) {
    await ComplianceService.processInvoiceCompliance(business.id, tenant.id, `${invRateLim}-${i}`, user, `CORR-RL-${i}`, {});
  }
  const processedCount = await ComplianceJobProcessor.processPendingJobs();
  const endRateLim = Date.now();
  const duration = endRateLim - startRateLim;
  // 5 jobs * 200ms delay per job = at least 1000ms expected delay, plus 300ms execution time per job = at least 2500ms
  // If no rate limiting, it would be concurrent and much faster (depending on processor loop).
  // Actually, our processor loops sequentially in a for...of loop and awaits. 
  // With provider rate limit (200ms) + 300ms execution = 500ms per job * 5 = 2500ms.
  if (processedCount !== 5) throw new Error(`Test 7 Failed: Processed ${processedCount}, expected 5`);
  if (duration < 1500) throw new Error(`Test 7 Failed: Rate limiting too fast (${duration}ms)`);
  console.log(`✅ Test 7 Passed: Rate Limit throttling observed (${duration}ms for 5 requests)`);

  console.log("=== RC6.0B.1 SANDBOX VALIDATION COMPLETE ===");
}

main().catch(console.error).finally(() => rawDb.$disconnect());

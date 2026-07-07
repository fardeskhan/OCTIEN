import { PrismaClient } from "@prisma/client";
import { BankStatementService } from "../src/lib/treasury/bank-statement-service";
import { ReconciliationEngine } from "../src/lib/treasury/reconciliation-engine";
import { ReconciliationSessionService } from "../src/lib/treasury/reconciliation-session-service";

const rawDb = new PrismaClient();

async function main() {
  console.log("=== STARTING RC6.1 TREASURY SANDBOX VALIDATION ===");

  // Cleanup old state
  await rawDb.bankReconciliationSummary.deleteMany({});
  await rawDb.bankReconciliationSession.deleteMany({});
  await rawDb.bankTransactionMatch.deleteMany({});
  await rawDb.bankTransaction.deleteMany({});
  await rawDb.bankStatement.deleteMany({});
  await rawDb.customerPayment.deleteMany({});
  await rawDb.supplierPayment.deleteMany({});
  await rawDb.customerInvoice.deleteMany({});

  const tenant = await rawDb.tenant.upsert({
    where: { slug: "ten-rc61" },
    update: {},
    create: { id: "ten-rc61", name: "Main Tenant", slug: "ten-rc61" }
  });

  const businessType = await rawDb.businessType.upsert({
    where: { name: "Sandbox Type" },
    update: {},
    create: { name: "Sandbox Type" }
  });

  const business = await rawDb.business.upsert({
    where: { slug: "biz-rc61" },
    update: {},
    create: { id: "biz-rc61", name: "COSMY Sandbox Corp", slug: "biz-rc61", tenantId: tenant.id, businessTypeId: businessType.id }
  });

  let currency = await rawDb.currency.findFirst({ where: { code: "USD" } });
  if (!currency) {
    currency = await rawDb.currency.create({ data: { code: "USD", name: "US Dollar", symbol: "$" } });
  }

  const bankAccount = await rawDb.bankAccount.upsert({
    where: { ledgerAccountId: "gl-bank-rc61" },
    update: {},
    create: {
      id: "bank-rc61",
      businessId: business.id,
      name: "HDFC Sandbox Checking",
      accountNumber: "000011112222",
      openingBalance: 10000,
      currencyId: currency.id,
      ledgerAccountId: "gl-bank-rc61"
    }
  });

  const customer = await rawDb.customer.create({
    data: { businessId: business.id, name: "RC61 Customer", code: `CUST-${Date.now()}` }
  });

  // Seed Operational Data for Matching
  // 1. Invoice that will be matched by Rule 3 (Invoice Regex)
  const invoice1 = await rawDb.customerInvoice.create({
    data: {
      id: "inv-61-001",
      code: "INV-2026-00124",
      businessId: business.id,
      customerId: customer.id,
      currencyId: currency.id,
      status: "ISSUED",
      totalAmount: 1500,
      remainingAmount: 1500,
      sourceType: "MANUAL",
      sourceId: "inv-61-001"
    }
  });

  // Corresponding un-cleared payment for Invoice 1
  const payment1 = await rawDb.customerPayment.create({
    data: {
      id: "pay-61-001",
      businessId: business.id,
      invoiceId: invoice1.id,
      amount: 1500,
      currencyId: currency.id,
      paymentDate: new Date("2026-07-05")
    }
  });

  // 2. Exact match payment (Rule 1)
  const payment2 = await rawDb.customerPayment.create({
    data: {
      id: "pay-61-002",
      businessId: business.id,
      amount: 2500,
      currencyId: currency.id,
      paymentDate: new Date("2026-07-05")
    }
  });

  console.log("✓ Operational Test Data Seeded.");

  // === Test 1: JSON Import Pipeline ===
  const transactionsJSON = [
    {
      date: "2026-07-05T10:00:00Z",
      narration: "Payment for INV-2026-00124 via NEFT",
      credit: 1500,
      balance: 11500
    },
    {
      date: "2026-07-05T12:00:00Z",
      narration: "CASH DEPOSIT EXACT",
      credit: 2500,
      balance: 14000
    },
    {
      date: "2026-07-05T14:00:00Z",
      narration: "BANK CHARGES",
      debit: 50,
      balance: 13950
    }
  ];

  const stmt = await BankStatementService.importTransactions(
    bankAccount.id,
    new Date("2026-07-05"),
    "HDFC_Statement_05_July.json",
    transactionsJSON,
    "user-rc61"
  );

  const txns = await rawDb.bankTransaction.findMany({ where: { statementId: stmt.id } });
  if (txns.length !== 3) throw new Error(`Test 1 Failed: Expected 3 imported transactions, got ${txns.length}`);
  console.log("✅ Test 1 Passed: JSON Statement Import Pipeline successful.");

  // === Test 2: Idempotency ===
  try {
    await BankStatementService.importTransactions(
      bankAccount.id,
      new Date("2026-07-05"),
      "HDFC_Statement_05_July.json",
      transactionsJSON,
      "user-rc61"
    );
    throw new Error("Test 2 Failed: Idempotency breach, duplicate import allowed.");
  } catch (err: any) {
    if (err.message.includes("Duplicate statement import detected")) {
      console.log("✅ Test 2 Passed: Duplicate statement import correctly blocked.");
    } else {
      throw err;
    }
  }

  // === Test 3: Auto-Reconciliation Engine ===
  const suggestionsCreated = await ReconciliationEngine.runAutoReconciliation(bankAccount.id);
  
  if (suggestionsCreated !== 2) {
    throw new Error(`Test 3 Failed: Expected 2 match suggestions, got ${suggestionsCreated}`);
  }

  const invoiceMatch = await rawDb.bankTransactionMatch.findFirst({
    where: { customerPaymentId: payment1.id },
    include: { bankTransaction: true }
  });
  if (invoiceMatch?.confidence !== "EXACT" || invoiceMatch?.status !== "SUGGESTED") {
    throw new Error("Test 3 Failed: Rule 3 (Invoice Pattern Match) did not generate EXACT SUGGESTED match.");
  }

  const exactAmountMatch = await rawDb.bankTransactionMatch.findFirst({
    where: { customerPaymentId: payment2.id }
  });
  if (exactAmountMatch?.confidence !== "HIGH") {
    throw new Error("Test 3 Failed: Rule 1 (Exact Amount) did not generate HIGH SUGGESTED match.");
  }

  console.log("✅ Test 3 Passed: Auto-Reconciliation Engine rules triggered successfully.");

  // === Test 4: Match Approval Logic ===
  await ReconciliationEngine.approveMatch(invoiceMatch.id, "user-rc61", "CORR-RC61");
  const approvedMatch = await rawDb.bankTransactionMatch.findUnique({ where: { id: invoiceMatch.id } });
  if (approvedMatch?.status !== "APPROVED") throw new Error("Test 4 Failed: Match not APPROVED");

  const clearedTxn = await rawDb.bankTransaction.findUnique({ where: { id: invoiceMatch.bankTransactionId } });
  if (clearedTxn?.status !== "MATCHED") throw new Error("Test 4 Failed: BankTransaction not marked MATCHED");
  
  const audits = await rawDb.auditEvent.findMany({ where: { entityId: clearedTxn!.id, eventType: "BANK_RECON_APPROVED" } });
  if (audits.length === 0) throw new Error("Test 4 Failed: Audit event missing.");
  
  console.log("✅ Test 4 Passed: Match Approval Logic and Audit Event completed.");

  // === Test 5: Session & Close Management ===
  const { summary } = await ReconciliationSessionService.createSession(
    bankAccount.id,
    new Date("2026-07-01"),
    new Date("2026-07-06"),
    13950 // Expected statement ending balance
  );

  // Book Balance = 10000 (opening) + 1500 (matched txn) = 11500
  // Unmatched Amount = 2500 + (-50) = 2450
  // Statement Balance = 13950
  // Difference = 13950 - 11500 = 2450 (which perfectly matches the unmatched amount, so no manual adjustment needed)

  if (Number(summary.bookBalance) !== 11500) throw new Error(`Test 5 Failed: Book balance wrong. Got ${summary.bookBalance}, expected 11500`);
  if (Number(summary.unmatchedAmount) !== 2450) throw new Error(`Test 5 Failed: Unmatched amount wrong. Got ${summary.unmatchedAmount}, expected 2450`);
  if (Number(summary.difference) !== 2450) throw new Error(`Test 5 Failed: Difference wrong. Got ${summary.difference}, expected 2450`);

  console.log("✅ Test 5 Passed: Session & Close calculations validated correctly.");
  
  console.log("=== RC6.1 TREASURY SANDBOX VALIDATION COMPLETE ===");
}

main().catch(console.error).finally(() => rawDb.$disconnect());

import { PrismaClient } from "@prisma/client";
import { BankService } from "../src/lib/finance/bank-service";
import { FinancialPostingService } from "../src/lib/finance/posting-engine";
import { BankReconciliationService } from "../src/lib/finance/reconciliation-service";

const db = new PrismaClient();

async function main() {
  console.log("=== STARTING RC5.2 BANK RECONCILIATION VALIDATION ===\n");

  const business = await db.business.findFirst();
  if (!business) throw new Error("No business found");

  // 1. Create a fresh Bank Account for clean testing
  console.log("1. Setting up fresh bank account for recon...");
  const bankAccount = await BankService.createBankAccount({
    businessId: business.id,
    name: "Recon Test Account",
    accountNumber: "RECON-001",
    openingBalance: 0
  });

  const linkedGL = await db.ledgerAccount.findUnique({
    where: { id: bankAccount.ledgerAccountId }
  });

  // 2. Simulate Operational Posting (Customer Payment)
  console.log("\n2. Simulating Operational Customer Payment of ₹15,000...");
  const simulatedPaymentId = "PAY-" + Date.now();
  
  const je = await FinancialPostingService.postEntry({
    businessId: business.id,
    description: "Recon Customer Payment",
    sourceType: "CUSTOMER_PAYMENT",
    sourceId: simulatedPaymentId,
    lines: [
      { accountCode: linkedGL!.accountCode, debit: 15000 },
      { accountCode: "1100", credit: 15000 }
    ]
  });

  // 3. Import Bank Statement
  console.log("\n3. Importing Bank Statement...");
  const stmtDate = new Date();
  await BankService.importStatement({
    bankAccountId: bankAccount.id,
    importedBy: "recon-test",
    statementDate: stmtDate,
    sourceFileName: "recon_test.csv",
    hash: "recon-hash-" + Date.now(),
    transactions: [
      { date: stmtDate, amount: 15000, narration: "EXACT MATCH TARGET" },
      { date: stmtDate, amount: 2000, narration: "UNMATCHED TARGET" }
    ]
  });

  // 4. Create Recon Session
  console.log("\n4. Creating Reconciliation Session...");
  const session = await BankReconciliationService.createSession({
    bankAccountId: bankAccount.id,
    startDate: new Date(stmtDate.getTime() - 86400000),
    endDate: new Date(stmtDate.getTime() + 86400000)
  });
  console.log(`✅ Session Created in status: ${session.status}`);

  // 5. Run Auto-Matching
  console.log("\n5. Running Auto-Matching Engine...");
  const matchResult = await BankReconciliationService.runAutoMatching(session.id);
  console.log(`✅ Matches created: ${matchResult.matchesCreated}`);

  // Fetch updated transactions to verify Match validations
  const txns = await db.bankTransaction.findMany({
    where: { bankAccountId: bankAccount.id },
    include: { matches: true }
  });

  for (const t of txns) {
    console.log(`   Transaction: ₹${t.amount} -> Matched: ₹${t.matchedAmount} [Status: ${t.status}]`);
    if (t.matches.length > 0) {
      console.log(`      Linked to Journal: ${t.matches[0].journalEntryId} via CP: ${t.matches[0].customerPaymentId}`);
      
      if (t.matchedAmount.toNumber() > Math.abs(t.amount.toNumber())) {
        console.error("      ❌ FAILED: Matched amount exceeded transaction amount!");
      } else {
        console.log("      ✅ Matched amount validated.");
      }
    }
  }

  // 6. Lock Session & Generate Summary
  console.log("\n6. Locking Session & Generating Summary...");
  const lockedSession = await BankReconciliationService.lockSession(session.id, "tester");
  console.log(`✅ Session status: ${lockedSession.session.status}`);
  
  console.log(`\nReconciliation Summary ID: ${lockedSession.summary.id}`);
  console.log(`   Book Balance:      ₹${lockedSession.summary.bookBalance}`);
  console.log(`   Statement Balance: ₹${lockedSession.summary.statementBalance}`);
  console.log(`   Matched Amount:    ₹${lockedSession.summary.matchedAmount}`);
  console.log(`   Unmatched Amount:  ₹${lockedSession.summary.unmatchedAmount}`);
  console.log(`   Difference:        ₹${lockedSession.summary.difference}`);

  console.log("\n=== RC5.2 BANK RECONCILIATION VALIDATION COMPLETE ===");
}

main().catch(console.error).finally(() => db.$disconnect());

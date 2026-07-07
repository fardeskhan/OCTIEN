import { PrismaClient } from "@prisma/client";
import { FinancialPostingService } from "../src/lib/finance/posting-engine";

const db = new PrismaClient();

async function main() {
  console.log("=== STARTING RC5.1 FINANCIAL CONTROLS VALIDATION ===\n");

  const business = await db.business.findFirst();
  if (!business) throw new Error("No business found");

  // Setup: Make sure period is OPEN and we have a control account set up
  let period = await db.accountingPeriod.findFirst({
    where: { businessId: business.id }
  });
  if (!period) throw new Error("No period found");

  await db.accountingPeriod.update({
    where: { id: period.id },
    data: { status: "OPEN" }
  });

  // Make 1100 a Control Account, and 9999 a regular account
  await db.ledgerAccount.update({
    where: { businessId_accountCode: { businessId: business.id, accountCode: "1100" } },
    data: { isControlAccount: true }
  });

  await db.ledgerAccount.upsert({
    where: { businessId_accountCode: { businessId: business.id, accountCode: "9999" } },
    update: { isControlAccount: false },
    create: {
      businessId: business.id,
      accountCode: "9999",
      name: "Miscellaneous Expense",
      accountType: "EXPENSE",
      normalBalance: "DEBIT",
      isControlAccount: false,
      allowPosting: true
    }
  });

  console.log("Setup complete.\n");

  // Helper to run tests
  const expectSuccess = async (name: string, fn: () => Promise<any>) => {
    try {
      await fn();
      console.log(`✅ [SUCCESS] ${name}`);
    } catch (e: any) {
      console.error(`❌ [FAIL] ${name} -> Expected Success but got: ${e.message}`);
    }
  };

  const expectFail = async (name: string, fn: () => Promise<any>) => {
    try {
      await fn();
      console.error(`❌ [FAIL] ${name} -> Expected Failure but it Succeeded!`);
    } catch (e: any) {
      console.log(`✅ [SUCCESS] ${name} -> Correctly rejected: ${e.message}`);
    }
  };

  // --- Test 1: OPEN -> Manual Journal (SUCCESS) ---
  await expectSuccess("Test 1: OPEN -> Manual Journal", () => 
    FinancialPostingService.postEntry({
      businessId: business.id,
      description: "Test 1",
      sourceType: "MANUAL_JOURNAL",
      sourceId: "T1",
      lines: [
        { accountCode: "5000", debit: 100 },
        { accountCode: "9999", credit: 100 }
      ]
    })
  );

  // --- Lock Period ---
  await db.accountingPeriod.update({
    where: { id: period.id },
    data: { status: "LOCKED" }
  });

  // --- Test 2: LOCKED -> Manual Journal (FAIL) ---
  await expectFail("Test 2: LOCKED -> Manual Journal", () => 
    FinancialPostingService.postEntry({
      businessId: business.id,
      description: "Test 2",
      sourceType: "MANUAL_JOURNAL",
      sourceId: "T2",
      lines: [
        { accountCode: "5000", debit: 100 },
        { accountCode: "9999", credit: 100 }
      ]
    })
  );

  // --- Test 3: LOCKED -> Adjust Journal (SUCCESS) ---
  await expectSuccess("Test 3: LOCKED -> Adjustment Journal w/ reason", () => 
    FinancialPostingService.postEntry({
      businessId: business.id,
      description: "Test 3",
      sourceType: "ADJUSTMENT_JOURNAL",
      sourceId: "T3",
      reason: "Audit Adjustment",
      lines: [
        { accountCode: "5000", debit: 100 },
        { accountCode: "9999", credit: 100 }
      ]
    })
  );

  // --- Close Period ---
  await db.accountingPeriod.update({
    where: { id: period.id },
    data: { status: "CLOSED" }
  });

  // --- Test 4: CLOSED -> Adjust Journal (FAIL) ---
  await expectFail("Test 4: CLOSED -> Adjustment Journal", () => 
    FinancialPostingService.postEntry({
      businessId: business.id,
      description: "Test 4",
      sourceType: "ADJUSTMENT_JOURNAL",
      sourceId: "T4",
      reason: "Audit Adjustment",
      lines: [
        { accountCode: "5000", debit: 100 },
        { accountCode: "9999", credit: 100 }
      ]
    })
  );

  // --- Reopen Period ---
  await db.accountingPeriod.update({
    where: { id: period.id },
    data: { status: "OPEN" }
  });

  // --- Test 5: Manual -> AR Control Account (FAIL) ---
  await expectFail("Test 5: MANUAL_JOURNAL -> AR Control Account", () => 
    FinancialPostingService.postEntry({
      businessId: business.id,
      description: "Test 5",
      sourceType: "MANUAL_JOURNAL",
      sourceId: "T5",
      lines: [
        { accountCode: "1100", debit: 100 }, // AR is Control
        { accountCode: "9999", credit: 100 }
      ]
    })
  );

  // --- Test 6: Adjust -> AR Control Account w/ Reason (SUCCESS) ---
  await expectSuccess("Test 6: ADJUSTMENT_JOURNAL -> AR Control Account", () => 
    FinancialPostingService.postEntry({
      businessId: business.id,
      description: "Test 6",
      sourceType: "ADJUSTMENT_JOURNAL",
      sourceId: "T6",
      reason: "Correction to AR",
      lines: [
        { accountCode: "1100", debit: 100 }, // AR is Control
        { accountCode: "9999", credit: 100 }
      ]
    })
  );

  console.log("\n=== RC5.1 VALIDATION COMPLETE ===");
}

main().catch(console.error).finally(() => db.$disconnect());

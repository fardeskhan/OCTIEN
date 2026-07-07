import { PrismaClient } from "@prisma/client";
import { BankService } from "../src/lib/finance/bank-service";
import { FinancialPostingService } from "../src/lib/finance/posting-engine";

const db = new PrismaClient();

async function main() {
  console.log("=== STARTING RC5.2 BANKING VALIDATION ===\n");

  const business = await db.business.findFirst();
  if (!business) throw new Error("No business found");

  // Ensure 1000 Cash & Bank exists
  await db.ledgerAccount.upsert({
    where: { businessId_accountCode: { businessId: business.id, accountCode: "1000" } },
    update: {},
    create: {
      businessId: business.id,
      accountCode: "1000",
      name: "Cash & Bank",
      accountType: "ASSET",
      normalBalance: "DEBIT",
      isControlAccount: true,
      allowPosting: false // Parent shouldn't be posted to
    }
  });

  // 1. Test Bank Account Creation
  console.log("1. Creating Bank Account...");
  const bankAccount = await BankService.createBankAccount({
    businessId: business.id,
    name: "ICICI Current Account",
    accountNumber: "000123456789",
    ifscCode: "ICIC0000001",
    openingBalance: 100000
  });

  console.log(`✅ Created Bank Account: ${bankAccount.name}`);

  const linkedGL = await db.ledgerAccount.findUnique({
    where: { id: bankAccount.ledgerAccountId }
  });
  console.log(`✅ Provisioned GL Account: ${linkedGL?.accountCode} - ${linkedGL?.name}`);
  console.log(`   isControlAccount: ${linkedGL?.isControlAccount}`);

  // 2. Simulate Operational Posting
  console.log("\n2. Simulating Operational Customer Payment...");
  await FinancialPostingService.postEntry({
    businessId: business.id,
    description: "Customer Payment Received",
    sourceType: "CUSTOMER_PAYMENT",
    sourceId: "PAY-100",
    lines: [
      { accountCode: linkedGL!.accountCode, debit: 50000 }, // +50,000 to Bank
      { accountCode: "1100", credit: 50000 } // -50,000 from AR (assuming 1100 exists)
    ]
  });
  console.log("✅ Journal Entry Posted (DR Bank, CR AR)");

  // 3. Test Statement Import
  console.log("\n3. Importing Bank Statement...");
  await BankService.importStatement({
    bankAccountId: bankAccount.id,
    importedBy: "system",
    statementDate: new Date(),
    sourceFileName: "icici_june.csv",
    hash: "abc123hash456",
    transactions: [
      { date: new Date(), amount: 50000, narration: "IMPS/JohnDoe/Payment" },
      { date: new Date(), amount: -2000, narration: "Bank Charges" }
    ]
  });
  console.log("✅ Statement Imported (2 Transactions)");

  // 4. Test Balances
  console.log("\n4. Calculating Derived Balances...");
  const balances = await BankService.getBankBalances(business.id, bankAccount.id);
  
  console.log(`   Book Balance:      ₹${balances.bookBalance}`);
  console.log(`   Statement Balance: ₹${balances.statementBalance}`);
  console.log(`   Difference:        ₹${balances.difference}`);

  if (balances.bookBalance === 50000 && balances.statementBalance === 148000 && balances.difference === 98000) {
      console.log("✅ All Balances perfectly derived!");
  } else {
      console.log("❌ Balance mismatch!");
  }

  console.log("\n=== RC5.2 VALIDATION COMPLETE ===");
}

main().catch(console.error).finally(() => db.$disconnect());

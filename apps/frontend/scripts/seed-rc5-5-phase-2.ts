import { PrismaClient } from "@prisma/client";
import { SupplierBillService } from "../src/lib/finance/supplier-bill-service";

const db = new PrismaClient();

async function main() {
  console.log("=== STARTING RC5.5 PHASE 2 VALIDATION ===\n");

  let business = await db.business.findFirst();
  if (!business) throw new Error("No business found");

  const currency = await db.currency.findFirst();
  if (currency && !business.defaultCurrencyId) {
    business = await db.business.update({ where: { id: business.id }, data: { defaultCurrencyId: currency.id } });
  }

  // Create a second business for cross-business testing
  const businessB = await db.business.upsert({
    where: { id: "test-biz-b" },
    update: {},
    create: { 
      id: "test-biz-b", 
      name: "UCO Test Biz", 
      slug: "test-biz-b", 
      tenant: { connect: { id: business.tenantId } },
      defaultCurrencyId: business.defaultCurrencyId,
      businessType: { connect: { id: business.businessTypeId } }
    }
  });

  const mkt = await db.costCenter.findFirst({ where: { businessId: business.id, code: "MKT" } });
  if (!mkt) throw new Error("MKT cost center not found");

  const inactiveCc = await db.costCenter.upsert({
    where: { businessId_code: { businessId: business.id, code: "INACTIVE_CC" } },
    update: {},
    create: {
      businessId: business.id,
      code: "INACTIVE_CC",
      name: "Inactive Cost Center",
      type: "OTHER",
      status: "INACTIVE"
    }
  });

  const foreignCc = await db.costCenter.upsert({
    where: { businessId_code: { businessId: businessB.id, code: "UCO_MKT" } },
    update: {},
    create: {
      businessId: businessB.id,
      code: "UCO_MKT",
      name: "UCO Marketing",
      type: "MARKETING"
    }
  });

  // Ensure accounts exist
  const apAccount = await db.ledgerAccount.upsert({
    where: { businessId_accountCode: { businessId: business.id, accountCode: "2000" } },
    update: {},
    create: { businessId: business.id, accountCode: "2000", name: "Accounts Payable", accountType: "LIABILITY", isControlAccount: true }
  });

  const marketingExpense = await db.ledgerAccount.upsert({
    where: { businessId_accountCode: { businessId: business.id, accountCode: "6100" } },
    update: {},
    create: { businessId: business.id, accountCode: "6100", name: "Marketing Expense", accountType: "EXPENSE", isControlAccount: false }
  });

  const supplier = await db.supplier.upsert({
    where: { businessId_code: { businessId: business.id, code: "VENDOR-01" } },
    update: {},
    create: { businessId: business.id, code: "VENDOR-01", name: "Test Vendor" }
  });

  // --- Test A: Valid allocation (Expense gets Cost Center) ---
  console.log("--- Test A & B: Valid allocation (Expense gets Cost Center, AP gets NULL) ---");
  const resultA = await SupplierBillService.createBill({
    businessId: business.id,
    supplierId: supplier.id,
    billDate: new Date(),
    dueDate: new Date(),
    reference: "INV-VALID-01",
    lines: [
      { description: "Facebook Ads", quantity: 1, unitPrice: 10000, accountId: marketingExpense.id, costCenterId: mkt.id }
    ]
  });

  const lines = await db.journalLine.findMany({ where: { journalEntryId: resultA.journalEntry.id } });
  const expenseLine = lines.find(l => l.accountId === marketingExpense.id);
  const apLine = lines.find(l => l.accountId === apAccount.id);

  if (expenseLine?.costCenterId === mkt.id) {
    console.log("✅ Test A Passed: Expense Journal Line has Cost Center = Marketing");
  } else {
    console.log(`❌ Test A Failed: Cost Center is ${expenseLine?.costCenterId}`);
  }

  if (apLine?.costCenterId === null) {
    console.log("✅ Test B Passed: AP Journal Line has Cost Center = NULL");
  } else {
    console.log(`❌ Test B Failed: AP Line Cost Center is ${apLine?.costCenterId}`);
  }

  // --- Test C: Inactive Cost Center rejected ---
  console.log("\n--- Test C: Inactive Cost Center rejected ---");
  try {
    await SupplierBillService.createBill({
      businessId: business.id,
      supplierId: supplier.id,
      billDate: new Date(),
      dueDate: new Date(),
      reference: "INV-INACTIVE-02",
      lines: [
        { description: "Test", quantity: 1, unitPrice: 1000, accountId: marketingExpense.id, costCenterId: inactiveCc.id }
      ]
    });
    console.log("❌ Test C Failed: Allowed allocation to INACTIVE cost center.");
  } catch (err: any) {
    if (err.message.includes("INACTIVE")) {
      console.log("✅ Test C Passed: Rejected allocation to INACTIVE cost center.");
    } else {
      console.log(`❌ Test C Failed with unexpected error: ${err.message}`);
    }
  }

  // --- Test D: Cross-Business Allocation rejected ---
  console.log("\n--- Test D: Cross-Business Allocation rejected ---");
  try {
    await SupplierBillService.createBill({
      businessId: business.id,
      supplierId: supplier.id,
      billDate: new Date(),
      dueDate: new Date(),
      reference: "INV-CROSS-03",
      lines: [
        { description: "Test", quantity: 1, unitPrice: 1000, accountId: marketingExpense.id, costCenterId: foreignCc.id }
      ]
    });
    console.log("❌ Test D Failed: Allowed cross-business allocation.");
  } catch (err: any) {
    if (err.message.includes("different business")) {
      console.log("✅ Test D Passed: Rejected cross-business allocation.");
    } else {
      console.log(`❌ Test D Failed with unexpected error: ${err.message}`);
    }
  }

  console.log("\n=== RC5.5 PHASE 2 VALIDATION COMPLETE ===");
}

main().catch(console.error).finally(() => db.$disconnect());

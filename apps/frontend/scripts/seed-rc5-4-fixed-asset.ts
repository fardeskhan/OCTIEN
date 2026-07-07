import { PrismaClient } from "@prisma/client";
import { FixedAssetService } from "../src/lib/finance/fixed-asset-service";

const db = new PrismaClient();

async function ensureControlAccounts(businessId: string) {
  const accounts = [
    { code: "1600", name: "Computers", type: "ASSET", isControlAccount: true },
    { code: "1610", name: "Accumulated Dep - Computers", type: "ASSET", isControlAccount: true },
    { code: "5200", name: "Computer Depreciation", type: "EXPENSE", isControlAccount: true }
  ];

  for (const acc of accounts) {
    await db.ledgerAccount.upsert({
      where: {
        businessId_accountCode: { businessId, accountCode: acc.code }
      },
      update: {},
      create: {
        businessId,
        accountCode: acc.code,
        name: acc.name,
        accountType: acc.type as any,
        isSystem: true,
        isControlAccount: acc.isControlAccount,
        allowPosting: true
      }
    });
  }
}

async function main() {
  console.log("=== STARTING RC5.4 FIXED ASSETS VALIDATION (PHASE 1) ===\n");

  const business = await db.business.findFirst();
  if (!business) throw new Error("No business found");

  // 1. Seed GL Accounts
  await ensureControlAccounts(business.id);
  console.log("✅ Seeded GL Accounts (1600, 1610, 5200)");

  // 2. Create Asset Category
  const category = await FixedAssetService.createAssetCategory({
    businessId: business.id,
    name: "Computers",
    description: "Office Laptops & Desktops",
    assetAccountId: "1600",
    accumulatedDepreciationAccountId: "1610",
    depreciationExpenseAccountId: "5200"
  });
  console.log(`✅ Created Asset Category: ${category.name} (Mapped to ${category.assetAccountId}, ${category.accumulatedDepreciationAccountId}, ${category.depreciationExpenseAccountId})`);

  // 3. Create Fixed Asset
  const laptop = await FixedAssetService.createFixedAsset({
    businessId: business.id,
    categoryId: category.id,
    assetCode: "LAP-001",
    name: "Laptop Dell Latitude",
    cost: 80000,
    residualValue: 5000,
    usefulLifeMonths: 36,
    status: "ACTIVE"
  });
  console.log(`✅ Created Fixed Asset: ${laptop.assetCode} - ${laptop.name} (Cost: ₹${laptop.cost})`);

  // 4. Test Derived NBV
  const assetWithNBV = await FixedAssetService.getAssetWithNBV(laptop.id);
  console.log(`\n--- DERIVED NET BOOK VALUE ---`);
  console.log(`Cost: ₹${assetWithNBV.cost}`);
  console.log(`Derived NBV: ₹${assetWithNBV.netBookValue}`);

  if (assetWithNBV.netBookValue === 80000) {
    console.log("✅ Derived NBV exactly matches Cost immediately after creation! (Test Passed)");
  } else {
    console.log("❌ Derived NBV test failed!");
  }

  console.log("\n=== RC5.4 FIXED ASSETS VALIDATION COMPLETE ===");
}

main().catch(console.error).finally(() => db.$disconnect());

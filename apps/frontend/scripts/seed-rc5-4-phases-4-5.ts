import { PrismaClient } from "@prisma/client";
import { AssetCapitalizationService } from "../src/lib/finance/asset-capitalization-service";
import { DepreciationEngine } from "../src/lib/finance/depreciation-engine";
import { AssetDisposalService } from "../src/lib/finance/asset-disposal-service";

const db = new PrismaClient();

async function main() {
  console.log("=== STARTING RC5.4 PHASES 4 & 5 VALIDATION ===\n");

  const business = await db.business.findFirst();
  if (!business) throw new Error("No business found");

  const category = await db.assetCategory.findFirst({
    where: { businessId: business.id, name: "Computers" }
  });
  if (!category) throw new Error("Computers category not found.");

  // Seed Required Accounts
  const accountSeeds = [
    { code: "1000", name: "Bank Account", type: "ASSET", isControlAccount: false },
    { code: "5300", name: "Depreciation Expense", type: "EXPENSE", isControlAccount: false },
    { code: "5400", name: "Loss On Asset Disposal", type: "EXPENSE", isControlAccount: false },
    { code: "4300", name: "Gain On Asset Disposal", type: "REVENUE", isControlAccount: false },
  ];

  for (const acc of accountSeeds) {
    await db.ledgerAccount.upsert({
      where: { businessId_accountCode: { businessId: business.id, accountCode: acc.code } },
      update: {},
      create: {
        businessId: business.id,
        accountCode: acc.code,
        name: acc.name,
        accountType: acc.type as any,
        isControlAccount: acc.isControlAccount
      }
    });
  }
  
  // Helper to create and partially depreciate an asset for testing
  async function createAssetForTest(code: string, cost: number, partialDepreciationMonths: number) {
    const acq = await AssetCapitalizationService.createAcquisition({
      businessId: business.id, description: `Test Asset ${code}`, cost, acquisitionDate: new Date()
    });
    const asset = await AssetCapitalizationService.capitalizeAsset({
      acquisitionId: acq.id, categoryId: category!.id, assetCode: code, name: `Test Asset ${code}`,
      residualValue: 0, usefulLifeMonths: 80, inServiceDate: new Date()
    });

    const schedules = await db.depreciationSchedule.findMany({ where: { assetId: asset.id }, orderBy: { scheduledDate: "asc" } });
    
    // Post partial depreciation
    for (let i = 0; i < partialDepreciationMonths; i++) {
      await db.accountingPeriod.upsert({
        where: { businessId_name: { businessId: business.id, name: schedules[i].periodId } },
        update: { status: "OPEN" },
        create: { businessId: business.id, name: schedules[i].periodId, startDate: new Date("2020-01-01"), endDate: new Date("2030-01-01"), status: "OPEN" }
      });
      await DepreciationEngine.postDepreciation(schedules[i].id);
    }
    
    return { asset, schedules };
  }

  // -------------------------------------------------------------
  // TEST A: Asset Sale Gain
  // -------------------------------------------------------------
  console.log("--- TEST A: ASSET SALE GAIN ---");
  // Cost = 80000. Depreciate 30000 (30 months at 1000/mo). NBV = 50000.
  const { asset: assetA } = await createAssetForTest("TEST-A", 80000, 30);
  const dispA = await AssetDisposalService.disposeAsset({
    assetId: assetA.id,
    disposalDate: new Date(),
    disposalType: "SALE",
    proceedsAmount: 60000,
    proceedsAccountCode: "1000"
  });
  if (dispA.disposal.gainLossAmount.toNumber() === 10000) {
    console.log(`✅ Gain recorded correctly: ₹10000`);
  } else {
    console.log(`❌ Gain expected 10000, got ${dispA.disposal.gainLossAmount}`);
  }

  // -------------------------------------------------------------
  // TEST B: Asset Sale Loss
  // -------------------------------------------------------------
  console.log("\n--- TEST B: ASSET SALE LOSS ---");
  const { asset: assetB } = await createAssetForTest("TEST-B", 80000, 30);
  const dispB = await AssetDisposalService.disposeAsset({
    assetId: assetB.id,
    disposalDate: new Date(),
    disposalType: "SALE",
    proceedsAmount: 40000,
    proceedsAccountCode: "1000"
  });
  if (dispB.disposal.gainLossAmount.toNumber() === -10000) {
    console.log(`✅ Loss recorded correctly: ₹-10000`);
  } else {
    console.log(`❌ Loss expected -10000, got ${dispB.disposal.gainLossAmount}`);
  }

  // -------------------------------------------------------------
  // TEST C: Fully Depreciated Asset
  // -------------------------------------------------------------
  console.log("\n--- TEST C: FULLY DEPRECIATED ASSET ---");
  // Cost = 80000. Depreciate 80000 (80 months at 1000/mo).
  const { asset: assetC } = await createAssetForTest("TEST-C", 80000, 80);
  const dispC = await AssetDisposalService.disposeAsset({
    assetId: assetC.id,
    disposalDate: new Date(),
    disposalType: "SCRAP",
    proceedsAmount: 0
  });
  if (dispC.disposal.gainLossAmount.toNumber() === 0) {
    console.log(`✅ Disposed fully depreciated asset. Gain/Loss = ₹0`);
  } else {
    console.log(`❌ Gain/Loss expected 0, got ${dispC.disposal.gainLossAmount}`);
  }

  // -------------------------------------------------------------
  // TEST D: Post Depreciation rejected for Disposed Asset
  // -------------------------------------------------------------
  console.log("\n--- TEST D: POST DEPRECIATION REJECTED ---");
  // Get an unposted schedule from asset A
  const unpostedSchedule = await db.depreciationSchedule.findFirst({
    where: { assetId: assetA.id, status: "SKIPPED" } // became skipped after disposal
  });
  
  // Reset it to pending to simulate an attempt to post a pending schedule on a disposed asset
  await db.depreciationSchedule.update({
    where: { id: unpostedSchedule!.id },
    data: { status: "PENDING" }
  });

  try {
    await DepreciationEngine.postDepreciation(unpostedSchedule!.id);
    console.log("❌ Test D Failed: Allowed posting on disposed asset");
  } catch (err: any) {
    if (err.message.includes("DISPOSED")) {
      console.log(`✅ Test D Passed: Rejected posting. ("${err.message}")`);
    } else {
      console.log(`❌ Test D Failed with wrong error: ${err.message}`);
    }
  }

  // -------------------------------------------------------------
  // TEST E: Re-dispose rejected for Disposed Asset
  // -------------------------------------------------------------
  console.log("\n--- TEST E: RE-DISPOSE REJECTED ---");
  try {
    await AssetDisposalService.disposeAsset({
      assetId: assetA.id,
      disposalDate: new Date(),
      disposalType: "SALE",
      proceedsAmount: 5000
    });
    console.log("❌ Test E Failed: Allowed double disposal");
  } catch (err: any) {
    if (err.message.includes("Cannot dispose asset with status DISPOSED")) {
      console.log(`✅ Test E Passed: Rejected double disposal. ("${err.message}")`);
    } else {
      console.log(`❌ Test E Failed with wrong error: ${err.message}`);
    }
  }

  console.log("\n=== RC5.4 PHASES 4 & 5 VALIDATION COMPLETE ===");
}

main().catch(console.error).finally(() => db.$disconnect());

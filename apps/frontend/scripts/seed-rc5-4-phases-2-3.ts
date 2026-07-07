import { PrismaClient } from "@prisma/client";
import { FixedAssetService } from "../src/lib/finance/fixed-asset-service";
import { AssetCapitalizationService } from "../src/lib/finance/asset-capitalization-service";
import { DepreciationEngine } from "../src/lib/finance/depreciation-engine";

const db = new PrismaClient();

async function main() {
  console.log("=== STARTING RC5.4 PHASES 2 & 3 VALIDATION ===\n");

  const business = await db.business.findFirst();
  if (!business) throw new Error("No business found");

  // 1. Get Category from Phase 1
  const category = await db.assetCategory.findFirst({
    where: { businessId: business.id, name: "Computers" }
  });
  if (!category) throw new Error("Computers category not found. Did you run Phase 1 seed?");

  // 2. Create Acquisition (from Supplier Bill workflow simulation)
  console.log("--- PHASE 2: ASSET CAPITALIZATION ---");
  const acquisition = await AssetCapitalizationService.createAcquisition({
    businessId: business.id,
    description: "MacBook Pro 16 from Apple India",
    cost: 80000,
    acquisitionDate: new Date("2027-01-01"),
  });
  console.log(`✅ Created Asset Acquisition (PENDING): Cost ₹${acquisition.cost}`);

  // 3. Capitalize Asset
  const asset = await AssetCapitalizationService.capitalizeAsset({
    acquisitionId: acquisition.id,
    categoryId: category.id,
    assetCode: "MAC-001",
    name: "MacBook Pro 16",
    residualValue: 5000,
    usefulLifeMonths: 36,
    inServiceDate: new Date("2027-01-15")
  });
  console.log(`✅ Capitalized Asset! Code: ${asset.assetCode}, ACTIVE`);

  // -------------------------------------------------------------
  // TEST 1: Schedule Generation
  // -------------------------------------------------------------
  console.log("\n--- TEST 1: SCHEDULE GENERATION ---");
  const schedules = await db.depreciationSchedule.findMany({
    where: { assetId: asset.id },
    orderBy: { scheduledDate: "asc" }
  });

  if (schedules.length === 36) {
    console.log("✅ Exactly 36 schedule records generated.");
  } else {
    console.log(`❌ Expected 36 schedules, got ${schedules.length}`);
  }

  // Validate Math: 75,000 / 36 = 2083.33
  const m1 = schedules[0].scheduledAmount.toNumber();
  const m36 = schedules[35].scheduledAmount.toNumber();
  if (m1 === 2083.33) {
    console.log(`✅ Month 1-35 Schedule Amount = ₹${m1}`);
  } else {
    console.log(`❌ Month 1 expected 2083.33, got ${m1}`);
  }

  if (m36 === 2083.45) { // 75000 - (2083.33 * 35) = 75000 - 72916.55 = 2083.45
    console.log(`✅ Month 36 (Variance Absorption) = ₹${m36}`);
  } else {
    console.log(`❌ Month 36 expected 2083.45, got ${m36}`);
  }

  // -------------------------------------------------------------
  // TEST 2: Month 1 Posting & NBV
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: POSTING & NBV (MONTH 1) ---");
  
  // Create OPEN period for 2027-01
  await db.accountingPeriod.upsert({
    where: { businessId_name: { businessId: business.id, name: "2027-01" } },
    update: { status: "OPEN" },
    create: { businessId: business.id, name: "2027-01", startDate: new Date("2027-01-01"), endDate: new Date("2027-01-31"), status: "OPEN" }
  });

  await DepreciationEngine.postDepreciation(schedules[0].id);
  const nbv1 = await DepreciationEngine.getNetBookValue(asset.id);
  
  // Expected NBV = 80000 - 2083.33 = 77916.67
  if (Math.abs(nbv1 - 77916.67) < 0.01) {
    console.log(`✅ Month 1 Posted! Derived NBV = ₹${nbv1.toFixed(2)} (Correct)`);
  } else {
    console.log(`❌ Month 1 NBV expected 77916.67, got ${nbv1}`);
  }

  // -------------------------------------------------------------
  // TEST 3: Month 36 Posting & Final NBV
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: FULL DEPRECIATION & RESIDUAL (MONTH 36) ---");
  
  // Post months 2 through 36
  for (let i = 1; i < 36; i++) {
    const pCode = schedules[i].periodId;
    // ensure period exists and is OPEN
    await db.accountingPeriod.upsert({
      where: { businessId_name: { businessId: business.id, name: pCode } },
      update: { status: "OPEN" },
      create: { businessId: business.id, name: pCode, startDate: new Date("2027-02-01"), endDate: new Date("2030-01-31"), status: "OPEN" }
    });

    await DepreciationEngine.postDepreciation(schedules[i].id);
  }

  const finalNbv = await DepreciationEngine.getNetBookValue(asset.id);
  
  if (finalNbv === 5000) {
    console.log(`✅ Fully Depreciated! Derived NBV = ₹${finalNbv} (Exact Residual Value)`);
  } else {
    console.log(`❌ Final NBV expected 5000, got ${finalNbv}`);
  }

  // -------------------------------------------------------------
  // TEST 4: LOCKED Period Rejection
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: LOCKED PERIOD PROTECTION ---");

  // Create another asset, schedule, and lock period
  const acq2 = await AssetCapitalizationService.createAcquisition({
    businessId: business.id, description: "Server", cost: 50000, acquisitionDate: new Date()
  });
  const asset2 = await AssetCapitalizationService.capitalizeAsset({
    acquisitionId: acq2.id, categoryId: category.id, assetCode: "SRV-001", name: "Server", residualValue: 0, usefulLifeMonths: 12, inServiceDate: new Date()
  });

  const schedules2 = await db.depreciationSchedule.findMany({ where: { assetId: asset2.id }, orderBy: { scheduledDate: "asc" } });
  
  // Lock the period
  await db.accountingPeriod.upsert({
    where: { businessId_name: { businessId: business.id, name: schedules2[0].periodId } },
    update: { status: "LOCKED" },
    create: { businessId: business.id, name: schedules2[0].periodId, startDate: new Date(), endDate: new Date(), status: "LOCKED" }
  });

  try {
    await DepreciationEngine.postDepreciation(schedules2[0].id);
    console.log("❌ Test 4 Failed: Allowed posting into LOCKED period");
  } catch (err: any) {
    if (err.message.includes("LOCKED")) {
      console.log(`✅ Test 4 Passed: Rejected posting into LOCKED period. ("${err.message}")`);
    } else {
      console.log(`❌ Test 4 Failed with wrong error: ${err.message}`);
    }
  }

  console.log("\n=== RC5.4 PHASES 2 & 3 VALIDATION COMPLETE ===");
}

main().catch(console.error).finally(() => db.$disconnect());

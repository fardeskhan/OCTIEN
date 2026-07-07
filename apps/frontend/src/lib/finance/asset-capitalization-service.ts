import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { DepreciationEngine } from "./depreciation-engine";

export class AssetCapitalizationService {
  
  /**
   * Creates an AssetAcquisition representing a pending asset purchase (e.g. from a Supplier Bill)
   */
  static async createAcquisition(params: {
    businessId: string;
    description: string;
    supplierBillId?: string;
    cost: number;
    acquisitionDate: Date;
  }) {
    return db.assetAcquisition.create({
      data: {
        businessId: params.businessId,
        description: params.description,
        supplierBillId: params.supplierBillId,
        cost: new Prisma.Decimal(params.cost),
        acquisitionDate: params.acquisitionDate,
        status: "PENDING"
      }
    });
  }

  /**
   * Capitalizes a PENDING acquisition into a full ACTIVE fixed asset.
   * Also immediately generates the immutable depreciation schedule.
   */
  static async capitalizeAsset(params: {
    acquisitionId: string;
    categoryId: string;
    assetCode: string;
    name: string;
    residualValue: number;
    usefulLifeMonths: number;
    inServiceDate: Date;
  }) {
    const acquisition = await db.assetAcquisition.findUniqueOrThrow({
      where: { id: params.acquisitionId }
    });

    if (acquisition.status !== "PENDING") {
      throw new Error("Only PENDING acquisitions can be capitalized.");
    }

    const cost = acquisition.cost;
    const capitalizedAt = new Date(); // The moment we hit 'Capitalize'

    // 1. Create the Fixed Asset (ACTIVE)
    const asset = await db.fixedAsset.create({
      data: {
        businessId: acquisition.businessId,
        categoryId: params.categoryId,
        assetCode: params.assetCode,
        name: params.name,
        cost,
        residualValue: new Prisma.Decimal(params.residualValue),
        usefulLifeMonths: params.usefulLifeMonths,
        purchaseDate: acquisition.acquisitionDate,
        capitalizedAt,
        inServiceDate: params.inServiceDate,
        status: "ACTIVE",
        depreciationMethod: "SLM"
      }
    });

    // 2. Mark Acquisition as CAPITALIZED and link it
    await db.assetAcquisition.update({
      where: { id: acquisition.id },
      data: {
        status: "CAPITALIZED",
        fixedAssetId: asset.id
      }
    });

    // 3. Generate the Immutable Depreciation Schedule (Rule 6)
    await DepreciationEngine.generateSchedule(asset.id);

    // 4. (Future) Trigger Journal Entry DR Asset CR AP
    // For Phase 2/3 focus we are validating the schedules and NBV derivation.
    
    return asset;
  }
}

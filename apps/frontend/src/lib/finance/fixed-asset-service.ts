import { db } from "@/lib/db";
import { FixedAssetStatus, Prisma } from "@prisma/client";

export class FixedAssetService {
  /**
   * Creates an Asset Category ensuring that it holds the structural GL references.
   */
  static async createAssetCategory(params: {
    businessId: string;
    name: string;
    description?: string;
    assetAccountId: string;
    accumulatedDepreciationAccountId: string;
    depreciationExpenseAccountId: string;
  }) {
    return db.assetCategory.create({
      data: {
        businessId: params.businessId,
        name: params.name,
        description: params.description,
        assetAccountId: params.assetAccountId,
        accumulatedDepreciationAccountId: params.accumulatedDepreciationAccountId,
        depreciationExpenseAccountId: params.depreciationExpenseAccountId,
      }
    });
  }

  /**
   * Registers a new individual fixed asset.
   */
  static async createFixedAsset(params: {
    businessId: string;
    categoryId: string;
    locationId?: string;
    assetCode: string;
    name: string;
    cost: number;
    residualValue: number;
    usefulLifeMonths: number;
    status?: FixedAssetStatus;
    purchaseDate?: Date;
  }) {
    return db.fixedAsset.create({
      data: {
        businessId: params.businessId,
        categoryId: params.categoryId,
        locationId: params.locationId,
        assetCode: params.assetCode,
        name: params.name,
        cost: new Prisma.Decimal(params.cost),
        residualValue: new Prisma.Decimal(params.residualValue),
        usefulLifeMonths: params.usefulLifeMonths,
        status: params.status || "DRAFT",
        purchaseDate: params.purchaseDate || new Date(),
        depreciationMethod: "SLM" // Fixed for RC5.4
      }
    });
  }

  /**
   * Dynamically derives the Net Book Value (NBV).
   * Formula: Cost - Posted Depreciation
   * For Phase 1, since there is no depreciation posted yet, it simply returns Cost.
   */
  static async getAssetWithNBV(assetId: string) {
    const asset = await db.fixedAsset.findUniqueOrThrow({
      where: { id: assetId },
      include: {
        category: true,
      }
    });

    // In a future phase, we will calculate sum(posted depreciation).
    // For now:
    const postedDepreciation = 0; 

    const netBookValue = asset.cost.toNumber() - postedDepreciation;

    return {
      ...asset,
      netBookValue
    };
  }
}

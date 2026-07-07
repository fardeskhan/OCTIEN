import { db } from "@/lib/db";
import { Prisma, TaxType } from "@prisma/client";

export class TaxMasterService {
  /**
   * Creates a new HSN/SAC code mapping for products.
   */
  static async createHsnSac(params: {
    businessId: string;
    code: string;
    description?: string;
    defaultTaxGroupId?: string;
  }) {
    return db.hsnSacCode.create({
      data: {
        businessId: params.businessId,
        code: params.code,
        description: params.description,
        defaultTaxGroupId: params.defaultTaxGroupId
      }
    });
  }

  /**
   * Creates a Tax Group with its underlying component rates.
   * e.g., GST 18% -> CGST 9%, SGST 9%, IGST 18%
   */
  static async createTaxGroup(params: {
    businessId: string;
    name: string;
    description?: string;
    isDefault?: boolean;
    rates: {
      taxType: TaxType;
      ratePercent: number;
    }[];
  }) {
    return db.$transaction(async (tx) => {
      // If this is set to default, unset other defaults
      if (params.isDefault) {
        await tx.taxGroup.updateMany({
          where: { businessId: params.businessId, isDefault: true },
          data: { isDefault: false }
        });
      }

      const taxGroup = await tx.taxGroup.create({
        data: {
          businessId: params.businessId,
          name: params.name,
          description: params.description,
          isDefault: params.isDefault || false,
          rates: {
            create: params.rates.map(r => ({
              taxType: r.taxType,
              ratePercent: new Prisma.Decimal(r.ratePercent)
            }))
          }
        },
        include: { rates: true }
      });

      return taxGroup;
    });
  }

  /**
   * Helper to retrieve a Tax Group by ID, including its rates.
   */
  static async getTaxGroup(id: string) {
    return db.taxGroup.findUnique({
      where: { id },
      include: { rates: true }
    });
  }
}

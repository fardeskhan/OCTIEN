import { TaxTreatment, TaxType } from "@prisma/client";

/**
 * PURE SERVICES
 * These services perform no database reads or writes. They take fully loaded
 * entity structures and compute deterministic outputs for the Tax Orchestrator.
 */

export interface TaxGroupDefinition {
  name: string;
  rates: {
    taxType: TaxType;
    ratePercent: number;
  }[];
}

export class TaxDeterminationService {
  /**
   * Deterministically evaluates the correct TaxTreatment.
   * Priority: EXEMPT -> EXPORT -> SEZ -> INTER_STATE -> INTRA_STATE
   */
  static determineTreatment(params: {
    businessState: string;
    customerState: string;
    customerType: "STANDARD" | "SEZ" | "EXPORT";
    isExempt: boolean;
  }): TaxTreatment {
    if (params.isExempt) return "EXEMPT";
    if (params.customerType === "EXPORT") return "EXPORT";
    if (params.customerType === "SEZ") return "SEZ";
    
    if (params.businessState.trim().toLowerCase() !== params.customerState.trim().toLowerCase()) {
      return "INTER_STATE";
    }

    return "INTRA_STATE";
  }
}

export class TaxCalculationService {
  /**
   * Calculates line-level taxes.
   * Rounding Rule: 2 Decimal Places, Half-Up.
   */
  static calculateLineTax(params: {
    sourceType: string;
    sourceId: string;
    lineNumber: number;
    hsnSacCode?: string;
    taxableAmount: number;
    taxTreatment: TaxTreatment;
    taxGroup: TaxGroupDefinition;
  }) {
    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;
    let cessRate = 0;

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let cessAmount = 0;
    
    // Only apply rates if it's not EXEMPT or EXPORT (Assuming zero-rated)
    // Note: Some SEZ might be IGST, but for basic GST logic, usually treated as IGST or zero-rated with LUT.
    // We will assume standard INTRA/INTER mapping here.
    if (params.taxTreatment === "INTRA_STATE") {
      cgstRate = params.taxGroup.rates.find(r => r.taxType === "CGST")?.ratePercent || 0;
      sgstRate = params.taxGroup.rates.find(r => r.taxType === "SGST")?.ratePercent || 0;
      cessRate = params.taxGroup.rates.find(r => r.taxType === "CESS")?.ratePercent || 0;
    } else if (params.taxTreatment === "INTER_STATE" || params.taxTreatment === "SEZ") {
      // Often SEZ implies IGST
      igstRate = params.taxGroup.rates.find(r => r.taxType === "IGST")?.ratePercent || 0;
      cessRate = params.taxGroup.rates.find(r => r.taxType === "CESS")?.ratePercent || 0;
    }

    // Calculation: Rounding half-up to 2 decimals
    const roundHalfUp = (num: number) => Math.round(num * 100) / 100;

    cgstAmount = roundHalfUp(params.taxableAmount * (cgstRate / 100));
    sgstAmount = roundHalfUp(params.taxableAmount * (sgstRate / 100));
    igstAmount = roundHalfUp(params.taxableAmount * (igstRate / 100));
    cessAmount = roundHalfUp(params.taxableAmount * (cessRate / 100));

    const totalTaxAmount = roundHalfUp(cgstAmount + sgstAmount + igstAmount + cessAmount);

    return {
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      lineNumber: params.lineNumber,
      taxTreatment: params.taxTreatment,
      hsnSacCode: params.hsnSacCode || null,
      taxableAmount: params.taxableAmount,

      cgstRate,
      cgstAmount,

      sgstRate,
      sgstAmount,

      igstRate,
      igstAmount,

      cessRate,
      cessAmount,

      totalTaxAmount
    };
  }
}

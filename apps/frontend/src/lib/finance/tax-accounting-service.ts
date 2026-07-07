import { Prisma, TaxSnapshot } from "@prisma/client";

export class TaxAccountingService {
  /**
   * Generates journal lines for SALES (Output Tax Liability).
   * Credits the appropriate 210X Output Tax control accounts based on the snapshot.
   */
  static generateSalesTaxLines(snapshot: TaxSnapshot): { accountCode: string; debit: number; credit: number }[] {
    const lines: { accountCode: string; debit: number; credit: number }[] = [];

    // Output Tax Liability is a CREDIT
    if (snapshot.cgstAmount.toNumber() > 0) {
      lines.push({ accountCode: "2100", debit: 0, credit: snapshot.cgstAmount.toNumber() });
    }
    if (snapshot.sgstAmount.toNumber() > 0) {
      lines.push({ accountCode: "2110", debit: 0, credit: snapshot.sgstAmount.toNumber() });
    }
    if (snapshot.igstAmount.toNumber() > 0) {
      lines.push({ accountCode: "2120", debit: 0, credit: snapshot.igstAmount.toNumber() });
    }
    if (snapshot.cessAmount.toNumber() > 0) {
      lines.push({ accountCode: "2130", debit: 0, credit: snapshot.cessAmount.toNumber() });
    }

    return lines;
  }

  /**
   * Generates journal lines for PURCHASES (Input Tax Credit).
   * Debits the appropriate 130X Input Tax control accounts based on the snapshot.
   */
  static generatePurchaseTaxLines(snapshot: TaxSnapshot): { accountCode: string; debit: number; credit: number }[] {
    const lines: { accountCode: string; debit: number; credit: number }[] = [];

    // Input Tax Credit is an ASSET -> DEBIT
    if (snapshot.cgstAmount.toNumber() > 0) {
      lines.push({ accountCode: "1300", debit: snapshot.cgstAmount.toNumber(), credit: 0 });
    }
    if (snapshot.sgstAmount.toNumber() > 0) {
      lines.push({ accountCode: "1310", debit: snapshot.sgstAmount.toNumber(), credit: 0 });
    }
    if (snapshot.igstAmount.toNumber() > 0) {
      lines.push({ accountCode: "1320", debit: snapshot.igstAmount.toNumber(), credit: 0 });
    }
    if (snapshot.cessAmount.toNumber() > 0) {
      lines.push({ accountCode: "1330", debit: snapshot.cessAmount.toNumber(), credit: 0 });
    }

    return lines;
  }

  /**
   * Enforces independent balancing validation prior to creating journal lines.
   */
  static validateLineIntegrity(snapshot: TaxSnapshot, expectedTotal: number) {
    const calculatedTotal = snapshot.taxableAmount.toNumber() + snapshot.totalTaxAmount.toNumber();
    
    // Round to 2 decimals to prevent floating point drift during validation
    const roundedCalculated = Math.round(calculatedTotal * 100) / 100;
    const roundedExpected = Math.round(expectedTotal * 100) / 100;

    if (roundedCalculated !== roundedExpected) {
      throw new Error(`Tax Integrity Failure: Taxable(${snapshot.taxableAmount}) + Tax(${snapshot.totalTaxAmount}) = ${roundedCalculated}, but expected ${roundedExpected}`);
    }
  }
}

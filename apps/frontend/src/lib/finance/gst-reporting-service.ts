import { Prisma, TaxSnapshot } from "@prisma/client";

export class GstReportingService {
  /**
   * Generates a GSTR-1 projection (Outward Supplies).
   * Only takes snapshots for CUSTOMER_INVOICE.
   */
  static generateGstr1(snapshots: TaxSnapshot[], invoiceCount: number) {
    let taxableValue = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let cessAmount = 0;

    for (const snap of snapshots) {
      if (snap.sourceType !== "CUSTOMER_INVOICE") continue;
      
      taxableValue += snap.taxableAmount.toNumber();
      cgstAmount += snap.cgstAmount.toNumber();
      sgstAmount += snap.sgstAmount.toNumber();
      igstAmount += snap.igstAmount.toNumber();
      cessAmount += snap.cessAmount.toNumber();
    }

    return {
      taxableValue,
      cgstAmount,
      sgstAmount,
      igstAmount,
      cessAmount,
      invoiceCount
    };
  }

  /**
   * Generates a GSTR-3B projection (Summary of Outward and Inward).
   * Net Liability = Output GST - Input GST
   */
  static generateGstr3b(snapshots: TaxSnapshot[]) {
    let outwardTaxableValue = 0;
    
    let outputCgst = 0;
    let outputSgst = 0;
    let outputIgst = 0;

    let inputCgst = 0;
    let inputSgst = 0;
    let inputIgst = 0;

    for (const snap of snapshots) {
      if (snap.sourceType === "CUSTOMER_INVOICE") {
        outwardTaxableValue += snap.taxableAmount.toNumber();
        outputCgst += snap.cgstAmount.toNumber();
        outputSgst += snap.sgstAmount.toNumber();
        outputIgst += snap.igstAmount.toNumber();
      } else if (snap.sourceType === "SUPPLIER_BILL") {
        inputCgst += snap.cgstAmount.toNumber();
        inputSgst += snap.sgstAmount.toNumber();
        inputIgst += snap.igstAmount.toNumber();
      }
    }

    const netTaxLiability = (outputCgst + outputSgst + outputIgst) - (inputCgst + inputSgst + inputIgst);

    return {
      outwardTaxableValue,
      outputCgst,
      outputSgst,
      outputIgst,
      inputCgst,
      inputSgst,
      inputIgst,
      netTaxLiability
    };
  }
}

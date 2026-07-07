import { TaxDeterminationService, TaxCalculationService } from "../src/lib/finance/tax-engine";
import { TaxType } from "@prisma/client";

async function main() {
  console.log("=== STARTING RC5.3 TAX ENGINE VALIDATION (PURE FUNCTIONS) ===\n");

  const gst18Group = {
    name: "GST 18%",
    rates: [
      { taxType: "CGST" as TaxType, ratePercent: 9 },
      { taxType: "SGST" as TaxType, ratePercent: 9 },
      { taxType: "IGST" as TaxType, ratePercent: 18 }
    ]
  };

  const gstExemptGroup = {
    name: "GST EXEMPT",
    rates: [
      { taxType: "CGST" as TaxType, ratePercent: 0 },
      { taxType: "SGST" as TaxType, ratePercent: 0 },
      { taxType: "IGST" as TaxType, ratePercent: 0 }
    ]
  };

  // ---------------------------------------------------------
  // Case 1: MH to MH (INTRA_STATE) -> CGST/SGST
  // ---------------------------------------------------------
  console.log("CASE 1: Maharashtra to Maharashtra (INTRA_STATE) @ GST 18%, ₹1000");
  const treatment1 = TaxDeterminationService.determineTreatment({
    businessState: "Maharashtra",
    customerState: "Maharashtra",
    customerType: "STANDARD",
    isExempt: false
  });
  
  const snap1 = TaxCalculationService.calculateLineTax({
    sourceType: "CUSTOMER_INVOICE",
    sourceId: "INV-101",
    lineNumber: 1,
    taxableAmount: 1000,
    taxTreatment: treatment1,
    taxGroup: gst18Group
  });

  console.log(`-> Treatment: ${snap1.taxTreatment}`);
  console.log(`-> CGST: ₹${snap1.cgstAmount} | SGST: ₹${snap1.sgstAmount} | IGST: ₹${snap1.igstAmount}`);
  if (snap1.cgstAmount === 90 && snap1.sgstAmount === 90 && snap1.igstAmount === 0) {
    console.log("✅ Case 1 Passed!");
  } else {
    console.log("❌ Case 1 Failed!");
  }
  
  // ---------------------------------------------------------
  // Case 2: MH to KA (INTER_STATE) -> IGST
  // ---------------------------------------------------------
  console.log("\nCASE 2: Maharashtra to Karnataka (INTER_STATE) @ GST 18%, ₹1000");
  const treatment2 = TaxDeterminationService.determineTreatment({
    businessState: "Maharashtra",
    customerState: "Karnataka",
    customerType: "STANDARD",
    isExempt: false
  });
  
  const snap2 = TaxCalculationService.calculateLineTax({
    sourceType: "CUSTOMER_INVOICE",
    sourceId: "INV-102",
    lineNumber: 1,
    taxableAmount: 1000,
    taxTreatment: treatment2,
    taxGroup: gst18Group
  });

  console.log(`-> Treatment: ${snap2.taxTreatment}`);
  console.log(`-> CGST: ₹${snap2.cgstAmount} | SGST: ₹${snap2.sgstAmount} | IGST: ₹${snap2.igstAmount}`);
  if (snap2.cgstAmount === 0 && snap2.sgstAmount === 0 && snap2.igstAmount === 180) {
    console.log("✅ Case 2 Passed!");
  } else {
    console.log("❌ Case 2 Failed!");
  }

  // ---------------------------------------------------------
  // Case 3: EXEMPT -> 0 Tax
  // ---------------------------------------------------------
  console.log("\nCASE 3: EXEMPT Treatment, ₹1000");
  const treatment3 = TaxDeterminationService.determineTreatment({
    businessState: "Maharashtra",
    customerState: "Maharashtra", // even if intra
    customerType: "STANDARD",
    isExempt: true // takes priority
  });
  
  const snap3 = TaxCalculationService.calculateLineTax({
    sourceType: "CUSTOMER_INVOICE",
    sourceId: "INV-103",
    lineNumber: 1,
    taxableAmount: 1000,
    taxTreatment: treatment3,
    taxGroup: gstExemptGroup
  });

  console.log(`-> Treatment: ${snap3.taxTreatment}`);
  console.log(`-> CGST: ₹${snap3.cgstAmount} | SGST: ₹${snap3.sgstAmount} | IGST: ₹${snap3.igstAmount}`);
  if (snap3.totalTaxAmount === 0) {
    console.log("✅ Case 3 Passed!");
  } else {
    console.log("❌ Case 3 Failed!");
  }

  // ---------------------------------------------------------
  // Case 4: Rounding Rules (Half-Up, 2 Decimals)
  // ---------------------------------------------------------
  console.log("\nCASE 4: Rounding Rules (₹999.99 @ GST 18%, INTRA_STATE)");
  // Expected CGST: 999.99 * 0.09 = 89.9991 -> Round Half-Up -> 90.00
  // Expected SGST: 999.99 * 0.09 = 89.9991 -> Round Half-Up -> 90.00
  const snap4 = TaxCalculationService.calculateLineTax({
    sourceType: "CUSTOMER_INVOICE",
    sourceId: "INV-104",
    lineNumber: 1,
    taxableAmount: 999.99,
    taxTreatment: "INTRA_STATE",
    taxGroup: gst18Group
  });

  console.log(`-> Taxable: ₹${snap4.taxableAmount}`);
  console.log(`-> CGST: ₹${snap4.cgstAmount} | SGST: ₹${snap4.sgstAmount}`);
  console.log(`-> Total Tax: ₹${snap4.totalTaxAmount}`);
  
  if (snap4.cgstAmount === 90.00 && snap4.sgstAmount === 90.00 && snap4.totalTaxAmount === 180.00) {
    console.log("✅ Case 4 Passed!");
  } else {
    console.log("❌ Case 4 Failed!");
  }

  console.log("\n=== RC5.3 TAX ENGINE VALIDATION COMPLETE ===");
}

main().catch(console.error);

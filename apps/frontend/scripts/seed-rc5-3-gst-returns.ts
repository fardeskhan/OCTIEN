import { Prisma, TaxSnapshot } from "@prisma/client";
import { GstReportingService } from "../src/lib/finance/gst-reporting-service";

async function main() {
  console.log("=== STARTING RC5.3 GST RETURNS VALIDATION ===\n");

  const snapshots: TaxSnapshot[] = [];

  // Mock 10 Sales Invoices (₹100,000 taxable total, CGST 9%, SGST 9%)
  // Total Expected Output Tax: CGST = 9000, SGST = 9000
  console.log("1. Generating 10 Sales Invoices (Total Taxable: ₹100,000)...");
  for (let i = 1; i <= 10; i++) {
    snapshots.push({
      sourceType: "CUSTOMER_INVOICE",
      taxableAmount: new Prisma.Decimal(10000), // 10000 * 10 = 100,000
      cgstAmount: new Prisma.Decimal(900),      // 900 * 10 = 9000
      sgstAmount: new Prisma.Decimal(900),      // 900 * 10 = 9000
      igstAmount: new Prisma.Decimal(0),
      cessAmount: new Prisma.Decimal(0),
      totalTaxAmount: new Prisma.Decimal(1800),
    } as TaxSnapshot);
  }

  // Mock Purchases (Input CGST 5000, Input SGST 5000)
  console.log("2. Generating Purchases (Total ITC: ₹10,000)...");
  snapshots.push({
    sourceType: "SUPPLIER_BILL",
    taxableAmount: new Prisma.Decimal(50000), 
    cgstAmount: new Prisma.Decimal(5000),
    sgstAmount: new Prisma.Decimal(5000),
    igstAmount: new Prisma.Decimal(0),
    cessAmount: new Prisma.Decimal(0),
    totalTaxAmount: new Prisma.Decimal(10000),
  } as TaxSnapshot);

  // Validate GSTR-1
  console.log("\n--- GSTR-1 PROJECTION ---");
  const gstr1 = GstReportingService.generateGstr1(snapshots, 10);
  console.log(`Outward Taxable: ₹${gstr1.taxableValue}`);
  console.log(`Outward CGST: ₹${gstr1.cgstAmount}`);
  console.log(`Outward SGST: ₹${gstr1.sgstAmount}`);
  
  if (gstr1.taxableValue === 100000 && gstr1.cgstAmount === 9000 && gstr1.sgstAmount === 9000) {
    console.log("✅ GSTR-1 Projection Validated!");
  } else {
    console.log("❌ GSTR-1 Projection Failed!");
  }

  // Validate GSTR-3B
  console.log("\n--- GSTR-3B PROJECTION ---");
  const gstr3b = GstReportingService.generateGstr3b(snapshots);
  console.log(`Total Output GST: ₹${gstr3b.outputCgst + gstr3b.outputSgst + gstr3b.outputIgst}`);
  console.log(`Total Input GST (ITC): ₹${gstr3b.inputCgst + gstr3b.inputSgst + gstr3b.inputIgst}`);
  console.log(`Net Liability: ₹${gstr3b.netTaxLiability}`);

  if (gstr3b.netTaxLiability === 8000) {
    console.log("✅ GSTR-3B Projection Validated! (Net Liability = 8,000)");
  } else {
    console.log("❌ GSTR-3B Projection Failed!");
  }

  console.log("\n=== RC5.3 GST RETURNS VALIDATION COMPLETE ===");
}

main().catch(console.error);

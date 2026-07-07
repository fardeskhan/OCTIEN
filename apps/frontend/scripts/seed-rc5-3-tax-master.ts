import { PrismaClient } from "@prisma/client";
import { TaxMasterService } from "../src/lib/finance/tax-master-service";

const db = new PrismaClient();

async function main() {
  console.log("=== STARTING RC5.3 TAX MASTER VALIDATION ===\n");

  const business = await db.business.findFirst();
  if (!business) throw new Error("No business found");

  // 1. Create Tax Groups
  console.log("1. Seeding Tax Groups...");

  const gst18 = await TaxMasterService.createTaxGroup({
    businessId: business.id,
    name: "GST 18%",
    description: "Standard GST 18% (9% CGST + 9% SGST + 18% IGST)",
    isDefault: true,
    rates: [
      { taxType: "CGST", ratePercent: 9 },
      { taxType: "SGST", ratePercent: 9 },
      { taxType: "IGST", ratePercent: 18 }
    ]
  });
  console.log(`✅ Created Tax Group: ${gst18.name} with ${gst18.rates.length} rates.`);

  const gst12 = await TaxMasterService.createTaxGroup({
    businessId: business.id,
    name: "GST 12%",
    description: "Standard GST 12% (6% CGST + 6% SGST + 12% IGST)",
    rates: [
      { taxType: "CGST", ratePercent: 6 },
      { taxType: "SGST", ratePercent: 6 },
      { taxType: "IGST", ratePercent: 12 }
    ]
  });
  console.log(`✅ Created Tax Group: ${gst12.name} with ${gst12.rates.length} rates.`);

  const exempt = await TaxMasterService.createTaxGroup({
    businessId: business.id,
    name: "GST EXEMPT",
    description: "Nil Rated / Exempt",
    rates: [
      { taxType: "CGST", ratePercent: 0 },
      { taxType: "SGST", ratePercent: 0 },
      { taxType: "IGST", ratePercent: 0 }
    ]
  });
  console.log(`✅ Created Tax Group: ${exempt.name} with ${exempt.rates.length} rates.`);

  // 2. Create HSN Code
  console.log("\n2. Seeding HSN/SAC Codes...");
  const hsnBev = await TaxMasterService.createHsnSac({
    businessId: business.id,
    code: "2202",
    description: "Waters, including mineral waters and aerated waters, containing added sugar or other sweetening matter or flavoured",
    defaultTaxGroupId: gst18.id
  });
  console.log(`✅ Created HSN Code: ${hsnBev.code} - Linked to default Tax Group: ${gst18.name}`);

  console.log("\n=== RC5.3 TAX MASTER VALIDATION COMPLETE ===");
}

main().catch(console.error).finally(() => db.$disconnect());

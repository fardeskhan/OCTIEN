import { PrismaClient, Prisma, TaxSnapshot } from "@prisma/client";
import { TaxAccountingService } from "../src/lib/finance/tax-accounting-service";

const db = new PrismaClient();

async function ensureControlAccounts(businessId: string) {
  const accounts = [
    { code: "1300", name: "Input CGST", type: "ASSET", isControlAccount: true },
    { code: "1310", name: "Input SGST", type: "ASSET", isControlAccount: true },
    { code: "1320", name: "Input IGST", type: "ASSET", isControlAccount: true },
    { code: "1330", name: "Input CESS", type: "ASSET", isControlAccount: true },
    
    { code: "2100", name: "Output CGST", type: "LIABILITY", isControlAccount: true },
    { code: "2110", name: "Output SGST", type: "LIABILITY", isControlAccount: true },
    { code: "2120", name: "Output IGST", type: "LIABILITY", isControlAccount: true },
    { code: "2130", name: "Output CESS", type: "LIABILITY", isControlAccount: true },
  ];

  for (const acc of accounts) {
    await db.ledgerAccount.upsert({
      where: {
        businessId_accountCode: { businessId, accountCode: acc.code }
      },
      update: {},
      create: {
        businessId,
        accountCode: acc.code,
        name: acc.name,
        accountType: acc.type as any,
        isSystem: true,
        isControlAccount: acc.isControlAccount,
        allowPosting: true
      }
    });
  }
}

function printJournal(journalLines: { accountCode: string; debit: number; credit: number }[]) {
  let totDebit = 0;
  let totCredit = 0;
  for (const line of journalLines) {
    if (line.debit > 0) {
      console.log(`DR ${line.accountCode.padEnd(8)} ₹${line.debit}`);
      totDebit += line.debit;
    }
    if (line.credit > 0) {
      console.log(`CR ${line.accountCode.padEnd(8)} ₹${line.credit}`);
      totCredit += line.credit;
    }
  }
  console.log(`Totals -> DR: ₹${totDebit} | CR: ₹${totCredit}`);
  return totDebit === totCredit;
}

async function main() {
  console.log("=== STARTING RC5.3 GL INTEGRATION VALIDATION ===\n");

  const business = await db.business.findFirst();
  if (!business) throw new Error("No business found");

  await ensureControlAccounts(business.id);
  console.log("✅ GST Control Accounts Seeded (1300s & 2100s)\n");

  // --------------------------------------------------------------------------
  // Case 1: Sales Invoice - INTRA_STATE (DR AR 1180, CR Rev 1000, CR CGST/SGST 90)
  // --------------------------------------------------------------------------
  console.log("CASE 1: Sales Invoice (INTRA_STATE)");
  const snap1 = {
    taxableAmount: new Prisma.Decimal(1000),
    cgstAmount: new Prisma.Decimal(90),
    sgstAmount: new Prisma.Decimal(90),
    igstAmount: new Prisma.Decimal(0),
    cessAmount: new Prisma.Decimal(0),
    totalTaxAmount: new Prisma.Decimal(180)
  } as TaxSnapshot;
  
  // Rule 3: Validate Integrity
  TaxAccountingService.validateLineIntegrity(snap1, 1180);

  // Operational Lines (AR and Rev)
  const salesLinesCase1 = [
    { accountCode: "1100", debit: 1180, credit: 0 }, // DR AR
    { accountCode: "4000", debit: 0, credit: 1000 }  // CR Rev
  ];
  // Tax Lines (Output Tax Liability)
  const taxLinesCase1 = TaxAccountingService.generateSalesTaxLines(snap1);

  const balanced1 = printJournal([...salesLinesCase1, ...taxLinesCase1]);
  if (balanced1) console.log("✅ Case 1 Passed (Balanced and Correct Direction)\n");
  else console.log("❌ Case 1 Failed\n");

  // --------------------------------------------------------------------------
  // Case 2: Purchase Bill - INTRA_STATE (DR Inv 1000, DR CGST/SGST 90, CR AP 1180)
  // --------------------------------------------------------------------------
  console.log("CASE 2: Purchase Bill (INTRA_STATE)");
  const snap2 = snap1; // Re-use same amounts
  
  TaxAccountingService.validateLineIntegrity(snap2, 1180);

  // Operational Lines (Inv and AP)
  const purchaseLinesCase2 = [
    { accountCode: "1200", debit: 1000, credit: 0 }, // DR Inventory
    { accountCode: "2000", debit: 0, credit: 1180 }  // CR AP
  ];
  // Tax Lines (Input Tax Credit)
  const taxLinesCase2 = TaxAccountingService.generatePurchaseTaxLines(snap2);

  const balanced2 = printJournal([...purchaseLinesCase2, ...taxLinesCase2]);
  if (balanced2) console.log("✅ Case 2 Passed (Balanced and Correct Direction)\n");
  else console.log("❌ Case 2 Failed\n");

  // --------------------------------------------------------------------------
  // Case 3: Sales Invoice - INTER_STATE (DR AR 1180, CR Rev 1000, CR IGST 180)
  // --------------------------------------------------------------------------
  console.log("CASE 3: Sales Invoice (INTER_STATE)");
  const snap3 = {
    taxableAmount: new Prisma.Decimal(1000),
    cgstAmount: new Prisma.Decimal(0),
    sgstAmount: new Prisma.Decimal(0),
    igstAmount: new Prisma.Decimal(180),
    cessAmount: new Prisma.Decimal(0),
    totalTaxAmount: new Prisma.Decimal(180)
  } as TaxSnapshot;
  
  TaxAccountingService.validateLineIntegrity(snap3, 1180);

  const salesLinesCase3 = [
    { accountCode: "1100", debit: 1180, credit: 0 },
    { accountCode: "4000", debit: 0, credit: 1000 }
  ];
  const taxLinesCase3 = TaxAccountingService.generateSalesTaxLines(snap3);

  const balanced3 = printJournal([...salesLinesCase3, ...taxLinesCase3]);
  if (balanced3) console.log("✅ Case 3 Passed (Balanced and Correct Direction)\n");
  else console.log("❌ Case 3 Failed\n");

  // --------------------------------------------------------------------------
  // Case 4: Sales Invoice - EXEMPT (DR AR 1000, CR Rev 1000)
  // --------------------------------------------------------------------------
  console.log("CASE 4: Sales Invoice (EXEMPT)");
  const snap4 = {
    taxableAmount: new Prisma.Decimal(1000),
    cgstAmount: new Prisma.Decimal(0),
    sgstAmount: new Prisma.Decimal(0),
    igstAmount: new Prisma.Decimal(0),
    cessAmount: new Prisma.Decimal(0),
    totalTaxAmount: new Prisma.Decimal(0)
  } as TaxSnapshot;
  
  TaxAccountingService.validateLineIntegrity(snap4, 1000);

  const salesLinesCase4 = [
    { accountCode: "1100", debit: 1000, credit: 0 },
    { accountCode: "4000", debit: 0, credit: 1000 }
  ];
  const taxLinesCase4 = TaxAccountingService.generateSalesTaxLines(snap4); // Should be empty

  const balanced4 = printJournal([...salesLinesCase4, ...taxLinesCase4]);
  if (balanced4 && taxLinesCase4.length === 0) {
    console.log("✅ Case 4 Passed (No GST Lines generated)\n");
  } else {
    console.log("❌ Case 4 Failed\n");
  }

  console.log("=== RC5.3 GL INTEGRATION VALIDATION COMPLETE ===");
}

main().catch(console.error).finally(() => db.$disconnect());

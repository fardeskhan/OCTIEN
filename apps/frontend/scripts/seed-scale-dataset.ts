import { db } from "../src/lib/db";
import { v4 as uuidv4 } from "uuid";
import * as crypto from "crypto";

const BATCH_SIZE = 1000;

async function chunkedInsert<T>(items: T[], inserter: (batch: T[]) => Promise<any>) {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await inserter(batch);
    process.stdout.write(`\rInserted ${Math.min(i + BATCH_SIZE, items.length)} / ${items.length} records...`);
  }
  console.log("");
}

async function main() {
  console.log("=== SEEDING SCALE DATASET ===");

  // Get base entities
  let business = await db.business.findFirst({ include: { tenant: true } });
  if (!business) {
    const tenant = await db.tenant.create({ data: { name: "Scale Tenant", slug: "scale-tenant" } });
    business = await db.business.create({
      data: {
        name: "Scale Business",
        slug: "scale-biz",
        tenantId: tenant.id,
        businessType: "COMPANY",
        defaultCurrencyId: "USD"
      },
      include: { tenant: true }
    });
  }

  let customer = await db.customer.findFirst({ where: { businessId: business.id } });
  if (!customer) {
    customer = await db.customer.create({
      data: { name: "Scale Customer", code: "SCALE-CUST", status: "ACTIVE", businessId: business.id }
    });
  }

  let supplier = await db.supplier.findFirst({ where: { businessId: business.id } });
  if (!supplier) {
    supplier = await db.supplier.create({
      data: { name: "Scale Supplier", code: "SCALE-SUPP", status: "ACTIVE", businessId: business.id }
    });
  }

  let account = await db.ledgerAccount.findFirst({ where: { businessId: business.id } });
  if (!account) {
    account = await db.ledgerAccount.create({
      data: {
        businessId: business.id,
        name: "Scale Sales Account",
        code: "4000",
        type: "INCOME"
      }
    });
  }
  
  let currency = await db.currency.findFirst();
  if (!currency) {
    currency = await db.currency.create({ data: { id: "USD", name: "US Dollar", symbol: "$" }});
  }

  console.log("Generating 50k Invoices & Receivables...");
  const suffix = Date.now();
  const invoices = [];
  const receivables = [];
  for (let i = 0; i < 50000; i++) {
    const invId = crypto.randomUUID();
    const code = `INV-S-${suffix}-${i}`;
    invoices.push({
      id: invId,
      code,
      businessId: business.id,
      customerId: customer.id,
      currencyId: currency.id,
      totalAmount: 100,
      paidAmount: 0,
      remainingAmount: 100,
      status: "ISSUED",
      sourceType: "MANUAL",
      sourceId: `SRC-INV-${suffix}-${i}`,
      createdAt: new Date()
    });
    receivables.push({
      id: crypto.randomUUID(),
      businessId: business.id,
      customerId: customer.id,
      sourceType: "CUSTOMER_INVOICE",
      sourceId: invId,
      amount: 100,
      paidAmount: 0,
      dueDate: new Date(),
      status: "OPEN"
    });
  }
  await chunkedInsert(invoices, (batch) => db.customerInvoice.createMany({ data: batch as any }));
  await chunkedInsert(receivables, (batch) => db.receivableEntry.createMany({ data: batch as any }));

  console.log("Generating 50k Journal Lines...");
  const journals = [];
  const lines = [];
  for (let i = 0; i < 25000; i++) {
    const jeId = crypto.randomUUID();
    journals.push({
      id: jeId,
      businessId: business.id,
      description: `Scale Journal ${i}`,
      date: new Date(),
      sourceType: "MANUAL_JOURNAL",
      sourceId: `SRC-JE-${suffix}-${i}`
    });
    // Two lines per journal = 50k lines
    lines.push({
      id: crypto.randomUUID(),
      journalEntryId: jeId,
      accountId: account.id,
      debit: 100,
      credit: 0,
      businessId: business.id
    });
    lines.push({
      id: crypto.randomUUID(),
      journalEntryId: jeId,
      accountId: account.id,
      debit: 0,
      credit: 100,
      businessId: business.id
    });
  }
  await chunkedInsert(journals, (batch) => db.journalEntry.createMany({ data: batch as any }));
  await chunkedInsert(lines, (batch) => db.journalLine.createMany({ data: batch as any }));

  console.log("Generating 20k Payments...");
  const payments = [];
  for (let i = 0; i < 20000; i++) {
    payments.push({
      id: crypto.randomUUID(),
      businessId: business.id,
      customerId: customer.id,
      amount: 100,
      currencyId: currency.id,
      paymentDate: new Date(),
      reference: `PMT-${i}`
    });
  }
  await chunkedInsert(payments, (batch) => db.customerPayment.createMany({ data: batch as any }));

  console.log("Generating 10k Inventory Transactions...");
  const variants = [];
  for (let i = 0; i < 10000; i++) {
    variants.push({
      id: crypto.randomUUID(),
      businessId: business.id,
      tenantId: business.tenantId,
      variantId: `VAR-${suffix}-${i}`,
      warehouseId: `WH-1`,
      onHandQuantity: 100,
      reservedQuantity: 0,
      availableQuantity: 100
    });
  }
  await chunkedInsert(variants, (batch) => db.inventoryVariantProjection.createMany({ data: batch as any }));

  console.log("Generating 10k Documents...");
  const docs = [];
  for (let i = 0; i < 10000; i++) {
    docs.push({
      id: crypto.randomUUID(),
      businessId: business.id,
      tenantId: business.tenantId,
      fileName: `doc-${suffix}-${i}.pdf`,
      storageUrl: `storage-${suffix}-${i}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 1024,
      sourceType: "CUSTOMER_INVOICE",
      sourceId: `EID-${suffix}-${i}`,
      status: "ACTIVE",
      uploadedBy: "system"
    });
  }
  await chunkedInsert(docs, (batch) => db.documentAttachment.createMany({ data: batch as any }));

  console.log("Generating 5k Payables...");
  const bills = [];
  const payables = [];
  for (let i = 0; i < 5000; i++) {
    const billId = crypto.randomUUID();
    bills.push({
      id: billId,
      code: `BILL-S-${suffix}-${i}`,
      businessId: business.id,
      supplierId: supplier.id,
      currencyId: currency.id,
      totalAmount: 50,
      paidAmount: 0,
      remainingAmount: 50,
      status: "APPROVED",
      sourceType: "MANUAL",
      sourceId: `SRC-BILL-${suffix}-${i}`,
      createdAt: new Date()
    });
    payables.push({
      id: crypto.randomUUID(),
      businessId: business.id,
      sourceType: "SUPPLIER_BILL",
      sourceId: billId,
      amount: 50,
      paidAmount: 0,
      dueDate: new Date(),
      status: "OPEN"
    });
  }
  await chunkedInsert(bills, (batch) => db.supplierBill.createMany({ data: batch as any }));
  await chunkedInsert(payables, (batch) => db.payableEntry.createMany({ data: batch as any }));

  console.log("Generating 5k Compliance Jobs...");
  const jobs = [];
  for (let i = 0; i < 5000; i++) {
    jobs.push({
      id: crypto.randomUUID(),
      businessId: business.id,
      tenantId: business.tenantId, // Using relation
      type: "GENERATE_IRN",
      status: "PENDING",
      payload: JSON.stringify({ invoiceId: `EID-${suffix}-${i}` }),
      correlationId: `CORR-${suffix}-${i}`,
      createdAt: new Date()
    });
  }
  await chunkedInsert(jobs, (batch) => db.complianceJob.createMany({ data: batch as any }));

  console.log("\n=== SCALE DATASET GENERATION COMPLETE ===");
}

main().catch(e => {
  console.error("Failed to seed:", e);
  process.exit(1);
});

import { PrismaClient, Prisma } from "@prisma/client";
import { processOutboxBatch } from "../src/lib/outbox";
import { FinancialReportingService } from "../src/lib/finance/financial-reporting";

const db = new PrismaClient();

async function main() {
  console.log("=== STARTING RC4 PHASE 1 GL VALIDATION ===");

  const suffix = Date.now().toString().slice(-6);

  let tenant = await db.tenant.findFirst();
  if (!tenant) tenant = await db.tenant.create({ data: { name: "Default Tenant", slug: "default-" + suffix, plan: "FREE" }});
  
  let bt = await db.businessType.findFirst();
  if (!bt) bt = await db.businessType.create({ data: { name: "Mfg", description: "Mfg" } });

  let business = await db.business.findFirst();
  if (!business) business = await db.business.create({ data: { tenantId: tenant.id, businessTypeId: bt.id, name: "UCO Manufacturing" }});

  let currency = await db.currency.findFirst({ where: { code: "INR" } });
  if (!currency) currency = await db.currency.create({ data: { businessId: business.id, code: "INR", name: "Indian Rupee", symbol: "₹" }});

  // 1. Setup Accounting Foundation
  const period = await db.accountingPeriod.upsert({
    where: { businessId_name: { businessId: business.id, name: "RC4-TEST-PERIOD" } },
    update: {},
    create: {
      businessId: business.id,
      name: "RC4-TEST-PERIOD",
      startDate: new Date("2020-01-01"),
      endDate: new Date("2030-12-31"),
      status: "OPEN"
    }
  });
  console.log("o Open Accounting Period verified.");

  const accounts = [
    { code: "1000", name: "Cash & Bank", type: "ASSET", normalBalance: "DEBIT" },
    { code: "1100", name: "Accounts Receivable", type: "ASSET", normalBalance: "DEBIT" },
    { code: "1200", name: "Inventory Asset", type: "ASSET", normalBalance: "DEBIT" },
    { code: "2000", name: "Accounts Payable", type: "LIABILITY", normalBalance: "CREDIT" },
    { code: "4000", name: "Revenue", type: "REVENUE", normalBalance: "CREDIT" },
    { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE", normalBalance: "DEBIT" },
  ];

  for (const acc of accounts) {
    await db.ledgerAccount.upsert({
      where: { businessId_accountCode: { businessId: business.id, accountCode: acc.code } },
      update: { normalBalance: acc.normalBalance as any },
      create: {
        businessId: business.id,
        accountCode: acc.code,
        name: acc.name,
        accountType: acc.type as any,
        normalBalance: acc.normalBalance as any,
        isSystem: true,
        allowPosting: true
      }
    });
  }
  console.log("o System Ledger Accounts configured.");

  const variant = await db.productVariant.findFirst({ where: { businessId: business.id } });
  if (!variant) throw new Error("No product variant found for business");

  const wh = await db.warehouse.upsert({
    where: { id: "WH-1" },
    update: {},
    create: {
      id: "WH-1",
      businessId: business.id,
      code: "WH-1",
      name: "Main Warehouse",
      warehouseType: "STORAGE"
    }
  });

  await db.inventoryVariantProjection.deleteMany({ where: { variantId: variant.id } });

  await db.inventoryVariantProjection.upsert({
    where: { businessId_variantId_warehouseId: { businessId: business.id, variantId: variant.id, warehouseId: "WH-1" } },
    update: {
      onHandQuantity: 0,
      averageCost: new Prisma.Decimal(0)
    },
    create: {
      businessId: business.id,
      tenantId: tenant.id,
      variantId: variant.id,
      warehouseId: "WH-1",
      onHandQuantity: 0,
      averageCost: new Prisma.Decimal(0)
    }
  });

  // 2. PROCURE TO PAY (Generates WAC & AP Journals)
  const vendor = await db.supplier.create({ data: { businessId: business.id, code: "V-" + suffix, name: "Bottle Co" }});
  const po = await db.purchaseOrder.create({
    data: {
      businessId: business.id,
      code: "PO-" + suffix,
      supplierId: vendor.id,
      currencyId: currency.id,
      status: "APPROVED",
      totalAmount: 50000,
      lines: { create: [{ variantId: variant.id, quantity: 1000, unitPrice: 50, totalPrice: 50000 }] }
    }, include: { lines: true }
  });
  const gr = await db.goodsReceiptRequest.create({
    data: {
      businessId: business.id,
      code: "GR-" + suffix,
      poId: po.id,
      warehouseId: "WH-1",
      status: "REQUESTED",
      lines: { create: [{ poLineId: po.lines[0].id, variantId: variant.id, requestedQty: 1000 }] }
    }
  });
  const grLine = await db.goodsReceiptLine.findFirst({where:{grId: gr.id}});
  
  await db.outboxEventRecord.create({
    data: {
      eventId: `EVT-GR-${suffix}`,
      eventType: "GoodsReceiptCompleted",
      aggregateId: gr.id,
      aggregateVersion: 1,
      businessId: business.id,
      tenantId: tenant.id,
      occurredAt: new Date(),
      payload: { poId: po.id, grId: gr.id, acceptedLines: [{ poLineId: grLine!.poLineId, variantId: variant.id, acceptedQty: 1000 }] },
      status: "PENDING"
    }
  });
  await processOutboxBatch(); // Generates Bill and WAC
  await processOutboxBatch(); // Creates SupplierBillCreated event

  // Verify WAC
  const proj = await db.inventoryVariantProjection.findFirst({ where: { variantId: variant.id } });
  if (proj?.averageCost.toNumber() !== 50) {
      throw new Error(`WAC should be 50, got ${proj?.averageCost.toNumber()}`);
  }
  console.log("o Goods Receipt Processed. WAC accurately calculated at ₹50.");

  const bill = await db.supplierBill.findFirst({ where: { sourceId: gr.id } });
  
  // Approve Bill (Triggers AP Journal)
  await db.supplierBill.update({ where: { id: bill!.id }, data: { status: "APPROVED" } });
  await db.outboxEventRecord.create({
    data: {
      eventId: `EVT-APRV-${suffix}`,
      eventType: "SupplierBillApproved",
      aggregateId: bill!.id,
      aggregateVersion: 1,
      businessId: business.id,
      tenantId: tenant.id,
      occurredAt: new Date(),
      payload: { billId: bill!.id, amount: bill!.totalAmount },
      status: "PENDING"
    }
  });
  await processOutboxBatch();
  console.log("o Supplier Bill Approved.");

  // 3. ORDER TO CASH (Generates AR, Revenue, COGS Journals)
  const customer = await db.customer.create({ data: { businessId: business.id, code: "C-" + suffix, name: "SuperMart" }});
  const so = await db.salesOrder.create({
    data: {
      businessId: business.id,
      code: "SO-" + suffix,
      customerId: customer.id,
      currencyId: currency.id,
      status: "APPROVED",
      totalAmount: 16000,
      lines: { create: [{ variantId: variant.id, quantity: 200, unitPrice: 80, totalPrice: 16000 }] }
    }, include: { lines: true }
  });

  const shipment = await db.shipment.create({
    data: {
      businessId: business.id,
      code: "SHP-" + suffix,
      salesOrder: { connect: { id: so.id } },
      warehouse: { connect: { id: "WH-1" } },
      status: "DISPATCHED",
      lines: { create: [{ soLineId: so.lines[0].id, variantId: variant.id, requestedQty: 200, shippedQty: 200 }] }
    }
  });

  // Dispatch Shipment
  await db.outboxEventRecord.create({
    data: {
      eventId: `EVT-DISP-${suffix}`,
      eventType: "ShipmentDispatched",
      aggregateId: shipment.id,
      aggregateVersion: 1,
      businessId: business.id,
      tenantId: tenant.id,
      occurredAt: new Date(),
      payload: { soId: so.id, shipmentId: shipment.id },
      status: "PENDING"
    }
  });
  await processOutboxBatch(); // Creates Invoice and COGS Journal
  await processOutboxBatch(); // Process CustomerInvoiceCreated -> AR Journal

  console.log("o Shipment Dispatched. COGS and AR Journals posted.");

  // 4. Verify Journals
  const journals = await db.journalEntry.findMany({ 
    where: { businessId: business.id },
    include: { lines: { include: { account: true } } }
  });

  console.log(`\nFound ${journals.length} Journal Entries for this flow:`);
  for (const j of journals) {
    console.log(`\n- ${j.description} (${j.sourceType})`);
    let debits = 0; let credits = 0;
    for (const l of j.lines) {
      console.log(`    ${l.account.accountCode} - ${l.account.name.padEnd(20)} | DR: ${l.debit.toString().padStart(6)} | CR: ${l.credit.toString().padStart(6)}`);
      debits += l.debit.toNumber();
      credits += l.credit.toNumber();
    }
    console.assert(debits === credits, "JOURNAL IS NOT BALANCED!");
  }

  console.log("\n=== 5. GENERATE TRIAL BALANCE ===");
  const tb = await FinancialReportingService.getTrialBalance(business.id, "Seed Script");
  console.assert(tb.isValid, "TRIAL BALANCE IS NOT BALANCED!");
  
  console.table(tb.rows.map(r => ({
    Code: r.accountCode,
    Name: r.accountName,
    Type: r.accountType,
    Normal: r.normalBalance,
    "Opening": r.openingBalance,
    "Debits": r.periodDebits,
    "Credits": r.periodCredits,
    "Closing": r.closingBalance
  })));
  
  console.log(`\nTotal Debit Normal: ${tb.totalDebitNormal} | Total Credit Normal: ${tb.totalCreditNormal}`);

  console.log("\n=== 6. GENERATE PROFIT & LOSS ===");
  const pl = await FinancialReportingService.getProfitAndLoss(business.id, "Seed Script");
  console.log(`Revenue: ${pl.revenue.total}`);
  console.log(`Expenses: ${pl.expenses.total}`);
  console.log(`Net Profit: ${pl.netProfit}`);

  console.log("\n=== 7. GENERATE BALANCE SHEET ===");
  const bs = await FinancialReportingService.getBalanceSheet(business.id, "Seed Script");
  console.log(`Assets: ${bs.assets.total}`);
  console.log(`Liabilities: ${bs.liabilities.total}`);
  console.log(`Equity (Base): ${bs.equity.total - bs.equity.currentPeriodProfit}`);
  console.log(`Current Period Profit: ${bs.equity.currentPeriodProfit}`);
  console.log(`Total L+E: ${bs.totalLiabilitiesAndEquity}`);

  console.assert(bs.totalAssets === bs.totalLiabilitiesAndEquity, "BALANCE SHEET DOES NOT BALANCE!");

  console.log("\n=== RC4 PHASE 2 & 3 VALIDATION COMPLETE ===");
}

main().catch(console.error).finally(() => db.$disconnect());

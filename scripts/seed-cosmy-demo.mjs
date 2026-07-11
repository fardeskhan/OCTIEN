/**
 * COSMY ERP — Client Demo Seeder (idempotent)
 *
 * Seeds the COSMY Group tenant with two real businesses — Salam Cola and COSMY UCO —
 * using the real data model so the executive dashboard, finance, procurement, sales and
 * inventory screens show consistent, computed numbers (NOT hardcoded).
 *
 * Run:  DATABASE_URL="file:.../dev.db" node scripts/seed-cosmy-demo.mjs
 * Safe to re-run: master data is upserted; journals are reset (delete + repost) so amounts
 * never double.
 */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

// The ExecutiveDashboardProjection columns exist in schema+client but may not be applied to a
// pre-existing sqlite DB. Add them non-destructively (idempotent).
for (const col of [
  "totalInventoryVal REAL NOT NULL DEFAULT 0", "openPOAmount REAL NOT NULL DEFAULT 0",
  "monthlySpend REAL NOT NULL DEFAULT 0", "activeSuppliers INTEGER NOT NULL DEFAULT 0",
  "pendingReceipts INTEGER NOT NULL DEFAULT 0", "lowStockAlerts INTEGER NOT NULL DEFAULT 0",
]) {
  try { await db.$executeRawUnsafe(`ALTER TABLE reporting_executive_dashboard ADD COLUMN ${col}`); } catch { /* exists */ }
}

const now = new Date();
const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
const txnDate = new Date(now.getFullYear(), now.getMonth(), 5);
const periodName = `${periodStart.toLocaleString("en-US", { month: "short" })} ${periodStart.getFullYear()}`;

const currency = (await db.currency.findFirst()) ?? (await db.currency.create({ data: { code: "INR", name: "Indian Rupee", symbol: "₹" } }));

// Deterministic realistic-name generators so demo lists feel full without looking auto-generated.
const CITIES = ["Mumbai", "Pune", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Surat", "Jaipur", "Nagpur", "Indore", "Lucknow", "Kanpur", "Nashik", "Coimbatore", "Kochi", "Vadodara", "Ludhiana", "Patna"];
function generateNames(baseNames, count, suffixes) {
  const names = [...baseNames];
  let i = 0;
  while (names.length < count) {
    const city = CITIES[i % CITIES.length];
    const suffix = suffixes[Math.floor(i / CITIES.length) % suffixes.length];
    const name = `${city} ${suffix}`;
    if (!names.includes(name)) names.push(name);
    i++;
    if (i > count * 4) break; // safety
  }
  return names.slice(0, count);
}
const CUSTOMER_SUFFIXES = ["Distributors", "Traders", "Enterprises", "Wholesale Co", "Supermarkets", "Retail Group", "Beverages", "Trading Co", "Agencies", "Marketing"];
const SUPPLIER_SUFFIXES = ["Packaging", "Ingredients", "Logistics", "Industries", "Materials", "Supplies", "Manufacturing", "Chemicals"];

let tenant = await db.tenant.findFirst({ where: { slug: "cosmy-group" } });
if (!tenant) tenant = await db.tenant.create({ data: { name: "COSMY Group", slug: "cosmy-group" } });

let ownerRole = await db.role.findFirst({ where: { tenantId: tenant.id, name: "Owner" } });
if (!ownerRole) ownerRole = await db.role.create({ data: { tenantId: tenant.id, name: "Owner", description: "Full access", isSystem: true } });
for (const p of await db.permission.findMany()) {
  await db.rolePermission.upsert({ where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: p.id } }, update: {}, create: { roleId: ownerRole.id, permissionId: p.id } });
}

// Demo user — repoint to COSMY Group so the group dashboard aggregates the two businesses.
const user = await db.user.findFirst({ where: { email: "owner@cosmy.ai" } });
await db.user.update({ where: { id: user.id }, data: { tenantId: tenant.id } });

// Remove memberships to businesses outside COSMY Group (e.g. leftover test tenants like
// "Aeterex Holdings") so the switcher and the no-cookie fallback only ever see the demo businesses.
await db.membership.deleteMany({ where: { userId: user.id, business: { tenantId: { not: tenant.id } } } });

let bizType = (await db.businessType.findFirst()) ?? (await db.businessType.create({ data: { name: "General" } }));

async function getBusiness(slug, name) {
  let b = await db.business.findFirst({ where: { slug } });
  b = b
    ? await db.business.update({ where: { id: b.id }, data: { tenantId: tenant.id, defaultCurrencyId: currency.id } })
    : await db.business.create({ data: { tenantId: tenant.id, businessTypeId: bizType.id, name, slug, status: "ACTIVE", defaultCurrencyId: currency.id, fiscalYearStartMonth: 4 } });
  await db.membership.upsert({ where: { userId_businessId: { userId: user.id, businessId: b.id } }, update: { roleId: ownerRole.id }, create: { userId: user.id, businessId: b.id, roleId: ownerRole.id } });
  return b;
}
const ledger = (bizId, code, name, type, normal) => db.ledgerAccount.upsert({ where: { businessId_accountCode: { businessId: bizId, accountCode: code } }, update: {}, create: { businessId: bizId, accountCode: code, name, accountType: type, normalBalance: normal } });

async function seedBusiness(b, cfg) {
  if (cfg.branding) await db.business.update({ where: { id: b.id }, data: cfg.branding });

  // Reset seeded transactional + master data (FK-safe order) so re-runs are fully idempotent at any
  // record count and old rows (e.g. the previous 3-digit customer codes) never linger.
  await db.eWayBill.deleteMany({ where: { businessId: b.id } }); // references invoices — delete first
  await db.goodsReceiptRequest.deleteMany({ where: { businessId: b.id } });
  await db.purchaseOrder.deleteMany({ where: { businessId: b.id } });
  await db.salesOrder.deleteMany({ where: { businessId: b.id } });
  await db.receivableEntry.deleteMany({ where: { businessId: b.id } });
  await db.customerInvoice.deleteMany({ where: { businessId: b.id } }); // lines cascade
  await db.payableEntry.deleteMany({ where: { businessId: b.id } });
  await db.supplierBill.deleteMany({ where: { businessId: b.id } }); // lines cascade
  await db.customer.deleteMany({ where: { businessId: b.id } });
  await db.supplier.deleteMany({ where: { businessId: b.id } });

  await db.accountingPeriod.upsert({ where: { businessId_name: { businessId: b.id, name: periodName } }, update: { status: "OPEN", startDate: periodStart, endDate: periodEnd }, create: { businessId: b.id, name: periodName, startDate: periodStart, endDate: periodEnd, status: "OPEN" } });

  const A = {
    cash: await ledger(b.id, "1000", "Cash & Bank", "ASSET", "DEBIT"),
    ar: await ledger(b.id, "1100", "Accounts Receivable", "ASSET", "DEBIT"),
    inv: await ledger(b.id, "1200", "Inventory", "ASSET", "DEBIT"),
    ap: await ledger(b.id, "2000", "Accounts Payable", "LIABILITY", "CREDIT"),
    rev: await ledger(b.id, "4000", "Sales Revenue", "REVENUE", "CREDIT"),
    cogs: await ledger(b.id, "5000", "Cost of Goods Sold", "EXPENSE", "DEBIT"),
    opex: await ledger(b.id, "6000", "Operating Expenses", "EXPENSE", "DEBIT"),
  };

  // Reset journals so re-runs never double the GL.
  await db.journalEntry.deleteMany({ where: { businessId: b.id } });
  const post = async (desc, st, lines) => {
    const je = await db.journalEntry.create({ data: { businessId: b.id, date: txnDate, description: desc, sourceType: st } });
    for (const l of lines) await db.journalLine.create({ data: { businessId: b.id, journalEntryId: je.id, accountId: l.a, debit: l.d ?? 0, credit: l.c ?? 0 } });
  };
  await post("Sales revenue (period)", "CUSTOMER_INVOICE", [{ a: A.ar.id, d: cfg.revenue }, { a: A.rev.id, c: cfg.revenue }]);
  await post("Cost of goods sold", "SHIPMENT_DISPATCH", [{ a: A.cogs.id, d: cfg.cogs }, { a: A.inv.id, c: cfg.cogs }]);
  await post("Operating expenses", "MANUAL_JOURNAL", [{ a: A.opex.id, d: cfg.opex }, { a: A.cash.id, c: cfg.opex }]);
  await post("Customer collections", "CUSTOMER_PAYMENT", [{ a: A.cash.id, d: cfg.collected }, { a: A.ar.id, c: cfg.collected }]);

  const bank = await db.bankAccount.findFirst({ where: { businessId: b.id } });
  if (bank) await db.bankAccount.update({ where: { id: bank.id }, data: { openingBalance: cfg.cash } });
  else await db.bankAccount.create({ data: { businessId: b.id, name: `${b.name} Operating A/C`, accountNumber: `AC-${b.slug}-001`, openingBalance: cfg.cash, currencyId: currency.id, status: "ACTIVE", ledgerAccountId: A.cash.id } });

  // Cash ledger (cash_transactions) — the /finance landing + treasury cash ledger read these.
  // They must reconcile to the same cash figure the dashboard reads from bankAccount.openingBalance.
  // net = openingCapital + collected - opex - supplierPaid = cfg.cash  → derive openingCapital.
  const supplierPaid = cfg.purchases - cfg.apOpen;
  const openingCapital = cfg.cash - cfg.collected + cfg.opex + supplierPaid;
  await db.cashTransaction.deleteMany({ where: { businessId: b.id } });
  const cashRows = [
    { type: "CASH_IN", amount: openingCapital, description: "Opening capital / balance carried forward", sourceType: "MANUAL" },
    { type: "CASH_IN", amount: cfg.collected, description: "Customer collections", sourceType: "MANUAL" },
    { type: "CASH_OUT", amount: supplierPaid, description: "Supplier payments", sourceType: "MANUAL" },
    { type: "CASH_OUT", amount: cfg.opex, description: "Operating expenses", sourceType: "MANUAL" },
  ];
  for (const r of cashRows) {
    if (r.amount <= 0) continue;
    await db.cashTransaction.create({ data: { businessId: b.id, type: r.type, amount: r.amount, currencyId: currency.id, description: r.description, sourceType: r.sourceType, occurredAt: txnDate } });
  }

  const unit = {};
  for (const [name, symbol] of cfg.units) unit[symbol] = await db.unit.upsert({ where: { businessId_symbol: { businessId: b.id, symbol } }, update: {}, create: { businessId: b.id, name, symbol } });

  const warehouses = [];
  for (const wn of cfg.warehouses) {
    let w = await db.warehouse.findFirst({ where: { businessId: b.id, name: wn } });
    if (!w) w = await db.warehouse.create({ data: { businessId: b.id, name: wn, code: wn.replace(/\s+/g, "-").toUpperCase().slice(0, 12) } });
    warehouses.push(w);
  }

  const variants = [];
  for (const p of cfg.products) {
    let prod = await db.product.findFirst({ where: { businessId: b.id, name: p.name } });
    if (!prod) prod = await db.product.create({ data: { businessId: b.id, name: p.name, type: "PHYSICAL", status: "ACTIVE" } });
    const sku = `${b.slug}-${p.name.replace(/[^a-zA-Z0-9]+/g, "-").toUpperCase()}`;
    let v = await db.productVariant.findFirst({ where: { businessId: b.id, productId: prod.id, name: p.name } });
    if (!v) v = await db.productVariant.create({ data: { businessId: b.id, productId: prod.id, sku, name: p.name, unitId: unit[p.unit].id, price: p.price, cost: p.cost } });
    await db.inventoryVariantProjection.upsert({ where: { businessId_variantId_warehouseId: { businessId: b.id, variantId: v.id, warehouseId: warehouses[0].id } }, update: { onHandQuantity: p.onHand, availableQuantity: p.onHand, averageCost: p.cost }, create: { businessId: b.id, tenantId: tenant.id, variantId: v.id, warehouseId: warehouses[0].id, onHandQuantity: p.onHand, availableQuantity: p.onHand, averageCost: p.cost } });
    variants.push({ id: v.id, price: p.price, cost: p.cost, name: p.name });
  }

  // Stock ledger — InventoryRecord + StockMovementRecord history that NETS EXACTLY to onHand.
  await db.stockMovementRecord.deleteMany({ where: { businessId: b.id } });
  await db.reservationRecord.deleteMany({ where: { businessId: b.id } }).catch(() => {});
  await db.inventoryRecord.deleteMany({ where: { businessId: b.id } });
  for (let vi = 0; vi < variants.length; vi++) {
    const v = variants[vi];
    const p = cfg.products[vi];
    const wh = warehouses[0];
    const inv = await db.inventoryRecord.create({ data: { id: `INV-${b.slug}-${vi + 1}`, businessId: b.id, tenantId: tenant.id, variantId: v.id, warehouseId: wh.id, createdBy: user.id, updatedBy: user.id } });
    const onHand = p.onHand;
    const rec1 = Math.round(onHand * 0.7), rec2 = Math.round(onHand * 0.5);
    const dispatched = -(Math.round(onHand * 0.22));
    const adjusted = onHand - (rec1 + rec2 + dispatched); // closes the ledger exactly to onHand
    const moves = [
      { type: "RECEIVED", qty: rec1, day: 2, note: "Opening receipt" },
      { type: "RECEIVED", qty: rec2, day: 8, note: "PO receipt" },
      { type: "DISPATCHED", qty: dispatched, day: 12, note: "Sales dispatch" },
      { type: "ADJUSTED", qty: adjusted, day: 15, note: "Cycle count adjustment" },
    ];
    let mi = 0;
    for (const m of moves) {
      if (m.qty === 0) continue;
      await db.stockMovementRecord.create({ data: { id: `MOV-${b.slug}-${vi + 1}-${++mi}`, businessId: b.id, tenantId: tenant.id, inventoryId: inv.id, variantId: v.id, warehouseId: wh.id, type: m.type, quantityValue: m.qty, quantityUnit: cfg.products[vi].unit, actorId: user.id, metadata: { note: m.note }, occurredAt: new Date(now.getFullYear(), now.getMonth(), m.day, 10) } });
    }
  }

  const customerNames = generateNames(cfg.customers, cfg.customerCount ?? cfg.customers.length, CUSTOMER_SUFFIXES);
  const creditCycle = ["GOOD", "GOOD", "GOOD", "GOOD", "HOLD", "GOOD", "GOOD", "BLOCKED", "GOOD", "HOLD"];
  const customers = [];
  for (let i = 0; i < customerNames.length; i++) {
    const code = `CUS-${b.slug}-${String(i + 1).padStart(4, "0")}`;
    let c = await db.customer.findFirst({ where: { businessId: b.id, code } });
    const creditStatus = creditCycle[i % creditCycle.length];
    const status = creditStatus === "BLOCKED" ? "ON_HOLD" : "ACTIVE";
    if (!c) c = await db.customer.create({ data: { businessId: b.id, code, name: customerNames[i], status, creditStatus } });
    customers.push(c);
  }
  const supplierNames = generateNames(cfg.suppliers, cfg.supplierCount ?? cfg.suppliers.length, SUPPLIER_SUFFIXES);
  const suppliers = [];
  for (let i = 0; i < supplierNames.length; i++) {
    const code = `SUP-${b.slug}-${String(i + 1).padStart(4, "0")}`;
    let s = await db.supplier.findFirst({ where: { businessId: b.id, code } });
    const riskLevel = ["LOW", "LOW", "LOW", "MEDIUM", "LOW", "HIGH"][i % 6];
    if (!s) s = await db.supplier.create({ data: { businessId: b.id, code, name: supplierNames[i], status: "ACTIVE", riskLevel } });
    suppliers.push(s);
  }

  // Invoices — count-driven with a paid/partial mix that still reconciles: Σ remaining = revenue − collected.
  const invN = cfg.invoiceCount ?? Math.min(6, customers.length);
  const perInv = Math.round(cfg.revenue / invN);
  const arOpenTotal = cfg.revenue - cfg.collected;
  const invOpenFlags = Array.from({ length: invN }, (_, i) => i % 2 === 1); // ~half carry a balance
  const invUnpaid = invOpenFlags.filter(Boolean).length || 1;
  const perInvOpen = Math.min(perInv, Math.round(arOpenTotal / invUnpaid));
  let arAssigned = 0, arSeen = 0;
  const dueSpread = (i) => new Date(now.getFullYear(), now.getMonth(), 5 + (i % 25)); // varied due dates → real aging
  for (let i = 0; i < invN; i++) {
    let remaining = 0;
    if (invOpenFlags[i]) { arSeen++; remaining = arSeen === invUnpaid ? Math.max(0, arOpenTotal - arAssigned) : perInvOpen; arAssigned += remaining; }
    const paid = perInv - remaining;
    const cust = customers[i % customers.length];
    const code = `INV-${b.slug}-${String(i + 1).padStart(4, "0")}`;
    const invStatus = remaining <= 0 ? "PAID" : "PARTIALLY_PAID";
    const data = { customerId: cust.id, currencyId: currency.id, totalAmount: perInv, paidAmount: paid, remainingAmount: remaining, status: invStatus, sourceType: "MANUAL", sourceId: `seed-${b.slug}-inv-${i}` };
    let iv = await db.customerInvoice.findFirst({ where: { businessId: b.id, code } });
    if (!iv) iv = await db.customerInvoice.create({ data: { businessId: b.id, code, ...data } });
    else await db.customerInvoice.update({ where: { id: iv.id }, data });
    // Invoice line items — reset & re-post so amounts reconcile to totalAmount and never double.
    await db.customerInvoiceLine.deleteMany({ where: { invoiceId: iv.id } });
    const lp = variants[i % variants.length], lp2 = variants[(i + 1) % variants.length];
    const amt1 = Math.round(perInv * 0.6), amt2 = perInv - amt1;
    for (const [prod, amt] of [[lp, amt1], [lp2, amt2]]) {
      const qty = Math.max(1, Math.round(amt / prod.price));
      await db.customerInvoiceLine.create({ data: { invoiceId: iv.id, description: prod.name, quantity: qty, unitPrice: prod.price, totalPrice: amt } });
    }
    const recStatus = remaining <= 0 ? "CLOSED" : (paid > 0 ? "PARTIALLY_PAID" : "OPEN");
    await db.receivableEntry.upsert({ where: { sourceType_sourceId: { sourceType: "CUSTOMER_INVOICE", sourceId: iv.id } }, update: { amount: perInv, paidAmount: paid, status: recStatus, dueDate: dueSpread(i) }, create: { businessId: b.id, customerId: cust.id, sourceType: "CUSTOMER_INVOICE", sourceId: iv.id, amount: perInv, paidAmount: paid, dueDate: dueSpread(i), status: recStatus } });
  }

  // Supplier bills — count-driven; Σ remaining = apOpen.
  const billN = cfg.billCount ?? Math.min(4, suppliers.length);
  const perBill = Math.round(cfg.purchases / billN);
  const billOpenFlags = Array.from({ length: billN }, (_, i) => i % 2 === 0);
  const billUnpaid = billOpenFlags.filter(Boolean).length || 1;
  const perBillOpen = Math.min(perBill, Math.round(cfg.apOpen / billUnpaid));
  let apAssigned = 0, apSeen = 0;
  for (let i = 0; i < billN; i++) {
    let remaining = 0;
    if (billOpenFlags[i]) { apSeen++; remaining = apSeen === billUnpaid ? Math.max(0, cfg.apOpen - apAssigned) : perBillOpen; apAssigned += remaining; }
    const paid = perBill - remaining;
    const sup = suppliers[i % suppliers.length];
    const code = `SB-${b.slug}-${String(i + 1).padStart(4, "0")}`;
    const billStatus = remaining <= 0 ? "PAID" : (paid > 0 ? "PARTIALLY_PAID" : "APPROVED");
    const data = { supplierId: sup.id, currencyId: currency.id, totalAmount: perBill, paidAmount: paid, remainingAmount: remaining, status: billStatus, sourceType: "MANUAL", sourceId: `seed-${b.slug}-bill-${i}` };
    let bl = await db.supplierBill.findFirst({ where: { businessId: b.id, code } });
    if (!bl) bl = await db.supplierBill.create({ data: { businessId: b.id, code, ...data } });
    else await db.supplierBill.update({ where: { id: bl.id }, data });
    const payStatus = remaining <= 0 ? "PAID" : (paid > 0 ? "PARTIAL" : "OPEN");
    await db.payableEntry.upsert({ where: { sourceType_sourceId: { sourceType: "SUPPLIER_BILL", sourceId: bl.id } }, update: { amount: perBill, paidAmount: paid, status: payStatus }, create: { businessId: b.id, sourceType: "SUPPLIER_BILL", sourceId: bl.id, amount: perBill, paidAmount: paid, dueDate: new Date(now.getFullYear(), now.getMonth(), 28), status: payStatus } });
  }

  // Procurement + sales transactions — POs, Goods Receipts, Sales Orders (already reset at top).
  const poCycle = [
    { status: "RECEIVED", mult: 1.0 },
    { status: "ORDERED", mult: 0.8 },
    { status: "APPROVED", mult: 0.6 },
    { status: "PARTIALLY_RECEIVED", mult: 0.7 },
    { status: "DRAFT", mult: 0.5 },
    { status: "RECEIVED", mult: 0.9 },
  ];
  const poN = cfg.poCount ?? poCycle.length;
  let openPOAmount = 0, pendingReceipts = 0, grnSeq = 0;
  for (let i = 0; i < poN; i++) {
    const plan = poCycle[i % poCycle.length];
    const v = variants[i % variants.length];
    const qty = Math.round((300 + (i % 12) * 120) * plan.mult);
    const unitPrice = v.cost;
    const total = qty * unitPrice;
    const isReceived = plan.status === "RECEIVED";
    const po = await db.purchaseOrder.create({ data: { businessId: b.id, code: `PO-${b.slug}-${String(i + 1).padStart(4, "0")}`, supplierId: suppliers[i % suppliers.length].id, status: plan.status, currencyId: currency.id, orderedAt: txnDate, expectedAt: new Date(now.getFullYear(), now.getMonth(), 10 + (i % 20)), totalAmount: total, createdBy: user.id } });
    const line = await db.purchaseOrderLine.create({ data: { poId: po.id, variantId: v.id, quantity: qty, unitPrice, totalPrice: total, receivedQty: isReceived ? qty : (plan.status === "PARTIALLY_RECEIVED" ? Math.round(qty / 2) : 0) } });
    if (isReceived) {
      grnSeq++;
      await db.goodsReceiptRequest.create({ data: { businessId: b.id, code: `GRN-${b.slug}-${String(grnSeq).padStart(4, "0")}`, poId: po.id, warehouseId: warehouses[0].id, status: "COMPLETED", receivedAt: txnDate, createdBy: user.id, lines: { create: [{ poLineId: line.id, variantId: v.id, requestedQty: qty, acceptedQty: qty, rejectedQty: 0, varianceQty: 0 }] } } });
    } else {
      openPOAmount += total;
      if (plan.status === "ORDERED" || plan.status === "PARTIALLY_RECEIVED") pendingReceipts += 1;
    }
  }

  const soCycle = ["FULFILLED", "CONFIRMED", "PARTIALLY_FULFILLED", "APPROVED", "DRAFT", "FULFILLED", "CONFIRMED"];
  const soN = cfg.soCount ?? soCycle.length;
  for (let i = 0; i < soN; i++) {
    const status = soCycle[i % soCycle.length];
    const v = variants[i % variants.length];
    const qty = 100 + (i % 15) * 35;
    const unitPrice = v.price;
    const total = qty * unitPrice;
    const fulfilled = status === "FULFILLED" ? qty : status === "PARTIALLY_FULFILLED" ? Math.round(qty / 2) : 0;
    await db.salesOrder.create({ data: { businessId: b.id, code: `SO-${b.slug}-${String(i + 1).padStart(4, "0")}`, customerId: customers[i % customers.length].id, status, currencyId: currency.id, totalAmount: total, createdBy: user.id, lines: { create: [{ variantId: v.id, quantity: qty, unitPrice, totalPrice: total, fulfilledQty: fulfilled }] } } });
  }

  // Logistics — transporters, vehicles, drivers, delivery runs with geo-stops, and E-Way bills.
  await db.deliveryRunStop.deleteMany({ where: { businessId: b.id } });
  await db.deliveryRun.deleteMany({ where: { businessId: b.id } });
  await db.eWayBill.deleteMany({ where: { businessId: b.id } });
  await db.vehicle.deleteMany({ where: { businessId: b.id } });
  await db.driver.deleteMany({ where: { businessId: b.id } });
  await db.transporter.deleteMany({ where: { businessId: b.id } });

  const CITY_COORDS = {
    Mumbai: [19.076, 72.8777], Pune: [18.5204, 73.8567], Nashik: [19.9975, 73.7898],
    Thane: [19.2183, 72.9781], "Navi Mumbai": [19.033, 73.0297], Nagpur: [21.1458, 79.0882],
    Surat: [21.1702, 72.8311], Ahmedabad: [23.0225, 72.5714],
  };
  const cityList = Object.keys(CITY_COORDS);
  const transporters = [];
  for (let i = 0; i < 3; i++) {
    const t = await db.transporter.create({ data: { businessId: b.id, code: `TRP-${b.slug}-${i + 1}`, name: `${cityList[i]} Freight Lines`, gstin: `27TRAN${1000 + i}Z${i}`, contactName: "Dispatch Desk", phone: `+91 900000${100 + i}` } });
    transporters.push(t);
  }
  const vehicles = [];
  for (let i = 0; i < 5; i++) {
    const t = transporters[i % transporters.length];
    const v = await db.vehicle.create({ data: { businessId: b.id, transporterId: t.id, registration: `MH${12 + i}AB${2000 + i}`, type: i % 2 ? "Truck" : "Tempo", capacityKg: 2000 + i * 500 } });
    vehicles.push(v);
  }
  const drivers = [];
  for (let i = 0; i < 5; i++) {
    const d = await db.driver.create({ data: { businessId: b.id, name: `${["Ravi", "Suresh", "Imran", "Anil", "Vikram"][i]} ${["Kumar", "Patil", "Shaikh", "Reddy", "Singh"][i]}`, phone: `+91 98${String(100000 + i * 137).slice(0, 6)}`, licenseNumber: `MH-DL-${20200 + i}`, transporterId: transporters[i % transporters.length].id, defaultVehicleId: vehicles[i % vehicles.length].id } });
    drivers.push(d);
  }
  const runStatuses = ["IN_TRANSIT", "SCHEDULED", "LOADING", "COMPLETED", "IN_TRANSIT", "SCHEDULED"];
  const runN = 6;
  for (let i = 0; i < runN; i++) {
    const veh = vehicles[i % vehicles.length];
    const run = await db.deliveryRun.create({ data: { businessId: b.id, code: `RUN-${b.slug}-${String(i + 1).padStart(3, "0")}`, transporterId: veh.transporterId, vehicleId: veh.id, driverId: drivers[i % drivers.length].id, status: runStatuses[i % runStatuses.length], dispatchDate: new Date(now.getFullYear(), now.getMonth(), 6 + (i % 20)) } });
    const stopCount = 3 + (i % 3);
    for (let s = 0; s < stopCount; s++) {
      const city = cityList[(i + s) % cityList.length];
      const [lat, lng] = CITY_COORDS[city];
      const cust = customers[(i * 3 + s) % customers.length];
      const stopStatus = run.status === "COMPLETED" ? "COMPLETED" : s === 0 && run.status === "IN_TRANSIT" ? "COMPLETED" : s === 1 && run.status === "IN_TRANSIT" ? "ARRIVED" : "PENDING";
      await db.deliveryRunStop.create({ data: { businessId: b.id, deliveryRunId: run.id, stopSequence: s + 1, locationName: `${city} Hub`, customerId: cust?.id ?? null, city, state: "Maharashtra", latitude: lat + (s * 0.02), longitude: lng + (s * 0.02), expectedArrival: new Date(now.getFullYear(), now.getMonth(), 6 + (i % 20), 9 + s * 2), status: stopStatus } });
    }
  }
  // E-Way bills for the first ~10 invoices.
  const ewbInvoices = await db.customerInvoice.findMany({ where: { businessId: b.id }, take: 12, orderBy: { code: "asc" } });
  const ewbStatuses = ["GENERATED", "GENERATED", "PENDING", "GENERATED", "DRAFT", "GENERATED", "CANCELLED"];
  for (let i = 0; i < ewbInvoices.length; i++) {
    const status = ewbStatuses[i % ewbStatuses.length];
    const generated = status === "GENERATED";
    await db.eWayBill.create({ data: { businessId: b.id, ewbNumber: `${b.slug.slice(0, 3).toUpperCase()}${String(100000000000 + i + (b.slug === "salam-cola" ? 0 : 500)).slice(0, 12)}`, invoiceId: ewbInvoices[i].id, generationSource: "MANUAL", status, validFrom: generated ? txnDate : null, validUntil: generated ? new Date(now.getFullYear(), now.getMonth(), 20) : null, vehicleNumber: vehicles[i % vehicles.length].registration, transporterName: transporters[i % transporters.length].name } });
  }

  const invValue = cfg.products.reduce((s, p) => s + p.onHand * p.cost, 0);
  await db.executiveDashboardProjection.upsert({ where: { businessId: b.id }, update: { totalInventoryVal: invValue, openPOAmount, activeSuppliers: suppliers.length, pendingReceipts }, create: { businessId: b.id, totalInventoryVal: invValue, openPOAmount, activeSuppliers: suppliers.length, pendingReceipts } });
  console.log(`  ${b.name}: rev ${cfg.revenue / 100000}L, profit ${(cfg.revenue - cfg.cogs - cfg.opex) / 100000}L, AR ${(cfg.revenue - cfg.collected) / 100000}L, inv ${invValue / 100000}L`);
}

await seedBusiness(await getBusiness("salam-cola", "Salam Cola"), {
  branding: { legalName: "Salam Cola Beverages Pvt Ltd", tagline: "Refreshment, bottled right.", primaryColor: "#b91c1c", accentColor: "#ef4444", email: "accounts@salamcola.example", phone: "+91 22 4000 1200", addressLine: "Plot 14, MIDC Industrial Area, Pune 411026", taxId: "27AABCS1429P1Z5", footerNote: "Salam Cola — a COSMY Group company. Thank you for stocking Salam Cola.", paymentInstructions: "Payment due within 15 days. Bank transfer to Salam Cola Operating A/C or UPI on request." },
  revenue: 12500000, cogs: 7500000, opex: 2000000, collected: 9000000, purchases: 8000000, apOpen: 1800000, cash: 5400000,
  customerCount: 55, supplierCount: 22, invoiceCount: 110, billCount: 32, poCount: 55, soCount: 45,
  units: [["Pieces", "PCS"], ["Case", "CASE"]],
  warehouses: ["Main Warehouse", "Finished Goods Warehouse", "Distributor Dispatch"],
  products: [
    { name: "Salam Cola 250ml", unit: "CASE", price: 240, cost: 150, onHand: 4200 },
    { name: "Salam Cola 500ml", unit: "CASE", price: 420, cost: 260, onHand: 3100 },
    { name: "Salam Orange 250ml", unit: "CASE", price: 240, cost: 150, onHand: 2600 },
    { name: "Salam Orange 500ml", unit: "CASE", price: 420, cost: 260, onHand: 1800 },
    { name: "Salam Lime 250ml", unit: "CASE", price: 240, cost: 150, onHand: 2200 },
    { name: "Salam Lime 500ml", unit: "CASE", price: 420, cost: 260, onHand: 1500 },
  ],
  customers: ["National Foods Ltd", "Metro Cash & Carry", "Regional Supply Co", "Sunrise Distributors", "GreenMart Retail", "CityFresh Supermarkets", "Al-Noor Trading", "Bay Area Beverages", "Coastal Distribution", "Prime Retail Group", "QuickStop Chain", "Horizon Wholesale"],
  suppliers: ["ClearGlass Bottling", "PrintPack Labels", "SecurePack Cartons", "SweetBase Ingredients", "CarboniQ Gas", "PalletPro Logistics"],
});

await seedBusiness(await getBusiness("cosmy-uco", "COSMY UCO"), {
  branding: { legalName: "COSMY UCO Recovery Pvt Ltd", tagline: "Used cooking oil, responsibly recovered.", primaryColor: "#15803d", accentColor: "#22c55e", email: "billing@cosmyuco.example", phone: "+91 22 4000 3400", addressLine: "Unit 7, Green Logistics Park, Navi Mumbai 400705", taxId: "27AACCU7781Q1Z9", footerNote: "COSMY UCO — a COSMY Group company. Certified collection & supply.", paymentInstructions: "Payment due within 30 days. Remit to COSMY UCO Operating A/C. Reference the invoice number on transfer." },
  revenue: 6500000, cogs: 4000000, opex: 800000, collected: 5300000, purchases: 4200000, apOpen: 600000, cash: 1900000,
  customerCount: 32, supplierCount: 14, invoiceCount: 65, billCount: 20, poCount: 32, soCount: 26,
  units: [["Litre", "LTR"], ["Kilogram", "KG"]],
  warehouses: ["Collection Warehouse", "Storage Tank Farm"],
  products: [
    { name: "Used Cooking Oil - Grade A", unit: "LTR", price: 55, cost: 34, onHand: 18000 },
    { name: "Used Cooking Oil - Grade B", unit: "LTR", price: 48, cost: 30, onHand: 9000 },
    { name: "Filtered UCO (Biodiesel Feed)", unit: "LTR", price: 62, cost: 40, onHand: 6500 },
  ],
  customers: ["Global Biofuels Ltd", "EcoDiesel Corp", "GreenSoap Manufacturing", "RenewFuel Industries"],
  suppliers: ["Metro Restaurant Group (source)", "Grand Hotels Collection", "FoodCourt Aggregators"],
});

// Audit history — genuine entries describing what this seed run created/reset (idempotent: reset seed entries).
{
  await db.auditLog.deleteMany({ where: { tenantId: tenant.id, action: { startsWith: "seed" } } });
  const businesses = await db.business.findMany({ where: { tenantId: tenant.id }, select: { id: true, name: true } });
  const now2 = Date.now();
  let i = 0;
  for (const biz of businesses) {
    const counts = {
      customers: await db.customer.count({ where: { businessId: biz.id } }),
      suppliers: await db.supplier.count({ where: { businessId: biz.id } }),
      invoices: await db.customerInvoice.count({ where: { businessId: biz.id } }),
      purchaseOrders: await db.purchaseOrder.count({ where: { businessId: biz.id } }),
      deliveryRuns: await db.deliveryRun.count({ where: { businessId: biz.id } }),
      journals: await db.journalEntry.count({ where: { businessId: biz.id } }),
    };
    for (const [resource, count] of Object.entries(counts)) {
      if (count === 0) continue;
      await db.auditLog.create({ data: { tenantId: tenant.id, businessId: biz.id, actorId: user.id, action: "seed_load", resource, metadata: { count, source: "seed-cosmy-demo" }, occurredAt: new Date(now2 - (++i) * 60000) } });
    }
  }
}

console.log("DONE — COSMY Group demo seeded for owner@cosmy.ai.");
await db.$disconnect();

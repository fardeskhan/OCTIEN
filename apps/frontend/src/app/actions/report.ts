// @ts-nocheck
"use server";

import { db } from "@/lib/db";
import { withActiveRecords } from "@/lib/db-helpers";
import { cookies } from "next/headers";

function getBusinessId() {
  const cookieStore = cookies();
  const businessId = cookieStore.get("current_business_id")?.value;
  if (!businessId) throw new Error("No business context selected");
  return businessId;
}

export async function getExecutiveDashboard() {
  const businessId = getBusinessId();
  let projection = await db.executiveDashboardProjection.findUnique({
    where: withActiveRecords({ businessId })
  });

  if (!projection) {
    // Return empty state if not yet calculated
    return {
      totalInventoryVal: 0,
      openPOAmount: 0,
      monthlySpend: 0,
      activeSuppliers: 0,
      pendingReceipts: 0,
      lowStockAlerts: 0,
    };
  }

  return projection;
}

export async function getInventoryReport() {
  const businessId = getBusinessId();
  // Fetch detailed inventory reporting projection with related warehouse and variant info
  const records = await db.inventoryReportProjection.findMany({
    where: withActiveRecords({ businessId }),
    orderBy: { totalValue: "desc" }
  });
  
  // To avoid querying relationships that don't exist directly on the projection in Prisma,
  // we'll fetch master data to enrich the report.
  const variants = await db.productVariant.findMany({
    where: withActiveRecords({ businessId }),
    include: { product: true }
  });
  const warehouses = await db.warehouse.findMany({ where: withActiveRecords({ businessId }) });

  const variantMap = new Map(variants.map(v => [v.id, v]));
  const warehouseMap = new Map(warehouses.map(w => [w.id, w]));

  return records.map(r => {
    const variant = variantMap.get(r.variantId);
    const warehouse = warehouseMap.get(r.warehouseId);
    return {
      ...r,
      productName: variant?.product.name || "Unknown Product",
      sku: variant?.sku || "N/A",
      warehouseName: warehouse?.name || "Unknown Warehouse"
    };
  });
}

export async function getProcurementReport() {
  const businessId = getBusinessId();
  const records = await db.procurementReportProjection.findMany({
    where: withActiveRecords({ businessId }),
    orderBy: { totalSpendYTD: "desc" }
  });

  const suppliers = await db.supplier.findMany({ where: withActiveRecords({ businessId }) });
  const supplierMap = new Map(suppliers.map(s => [s.id, s]));

  return records.map(r => {
    const supplier = supplierMap.get(r.supplierId);
    return {
      ...r,
      supplierName: supplier?.name || "Unknown Supplier",
      supplierCode: supplier?.code || "N/A"
    };
  });
}

// Temporary recalculation trigger for V1, mimicking an event listener
export async function recalculateExecutiveDashboard() {
  const businessId = getBusinessId();
  
  // Calculate total inventory value
  const inventoryAgg = await db.inventoryReportProjection.aggregate({
    where: withActiveRecords({ businessId }),
    _sum: { totalValue: true }
  });

  // Calculate open POs
  const openPOs = await db.purchaseOrder.aggregate({
    where: { businessId, status: { in: ["ORDERED", "PARTIALLY_RECEIVED"] } },
    _sum: { totalAmount: true }
  });

  // Calculate active suppliers
  const suppliersCount = await db.supplier.count({
    where: { businessId, status: "ACTIVE" }
  });

  // Calculate pending receipts
  const receiptsCount = await db.goodsReceiptRequest.count({
    where: { businessId, status: { in: ["REQUESTED", "PROCESSING"] } }
  });

  await db.executiveDashboardProjection.upsert({
    where: withActiveRecords({ businessId }),
    create: {
      businessId,
      totalInventoryVal: inventoryAgg._sum.totalValue || 0,
      openPOAmount: openPOs._sum.totalAmount || 0,
      activeSuppliers: suppliersCount,
      pendingReceipts: receiptsCount,
    },
    update: {
      totalInventoryVal: inventoryAgg._sum.totalValue || 0,
      openPOAmount: openPOs._sum.totalAmount || 0,
      activeSuppliers: suppliersCount,
      pendingReceipts: receiptsCount,
    }
  });
}

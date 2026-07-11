"use server";

import { db } from "@/lib/db";
import { withActiveRecords } from "@/lib/db-helpers";

async function getBusinessId() {
  const { getActiveBusinessId } = await import("@/lib/server-auth");
  return getActiveBusinessId();
}

export async function getExecutiveDashboard() {
  const businessId = await getBusinessId();
  const projection = await db.executiveDashboardProjection.findUnique({
    where: { businessId }
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
  const businessId = await getBusinessId();
  // Fetch detailed inventory reporting projection with related warehouse and variant info
  const records = await db.inventoryReportProjection.findMany({
    where: { businessId },
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
  const businessId = await getBusinessId();
  const records = await db.procurementReportProjection.findMany({
    where: { businessId },
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
  const businessId = await getBusinessId();

  // Calculate total inventory value
  const inventoryAgg = await db.inventoryReportProjection.aggregate({
    where: { businessId },
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

  const totalInventoryVal = inventoryAgg._sum?.totalValue ?? 0;
  const openPOAmount = openPOs._sum?.totalAmount ?? 0;

  await db.executiveDashboardProjection.upsert({
    where: { businessId },
    create: {
      businessId,
      totalInventoryVal,
      openPOAmount,
      activeSuppliers: suppliersCount,
      pendingReceipts: receiptsCount,
    },
    update: {
      totalInventoryVal,
      openPOAmount,
      activeSuppliers: suppliersCount,
      pendingReceipts: receiptsCount,
    }
  });
}

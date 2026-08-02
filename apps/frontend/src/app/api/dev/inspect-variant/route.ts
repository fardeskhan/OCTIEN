import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Dev-only: inspect (and optionally purge) inventory projections for a variant, flagging ORPHANED
 * projections whose warehouse no longer exists — these pollute the cross-warehouse WAC blend.
 * GET /api/dev/inspect-variant?purge=1 to delete orphans (and their inventory records/movements).
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "nope" }, { status: 404 });
  const url = new URL(request.url);
  const purge = url.searchParams.get("purge") === "1";
  const setwac = url.searchParams.get("setwac"); // restore real (non-orphan) projections' averageCost
  const setOnHand = url.searchParams.get("setonhand"); // "WAREHOUSE_CODE_PREFIX:qty,..." restore onHand

  const variant = await db.productVariant.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } });
  if (!variant) return NextResponse.json({ error: "no variant" });
  const businessId = variant.businessId;

  // Business-wide projection consistency scan: available must equal onHand − reserved everywhere.
  // ?scanall=1 reports; &repairall=1 repairs (recompute reserved from active reservations).
  if (url.searchParams.get("scanall") === "1") {
    const all = await db.inventoryVariantProjection.findMany({ where: { businessId } });
    const bad = all.filter((p) => Math.abs(p.availableQuantity - (p.onHandQuantity - p.reservedQuantity)) > 1e-6);
    let repaired = 0;
    if (url.searchParams.get("repairall") === "1") {
      for (const p of bad) {
        const inv = await db.inventoryRecord.findUnique({ where: { businessId_variantId_warehouseId: { businessId, variantId: p.variantId, warehouseId: p.warehouseId } }, select: { id: true } });
        const reserved = inv ? (await db.reservationRecord.aggregate({ where: { businessId, inventoryId: inv.id, status: "ACTIVE" }, _sum: { quantity: true } }))._sum.quantity ?? 0 : 0;
        await db.inventoryVariantProjection.update({ where: { businessId_variantId_warehouseId: { businessId, variantId: p.variantId, warehouseId: p.warehouseId } }, data: { reservedQuantity: reserved, availableQuantity: p.onHandQuantity - reserved } });
        repaired++;
      }
    }
    return NextResponse.json({ businessId, totalProjections: all.length, inconsistent: bad.length, repaired, sample: bad.slice(0, 10).map((p) => ({ variantId: p.variantId, warehouseId: p.warehouseId, onHand: p.onHandQuantity, reserved: p.reservedQuantity, available: p.availableQuantity })) });
  }

  const projs = await db.inventoryVariantProjection.findMany({ where: { businessId, variantId: variant.id } });
  const whIds = [...new Set(projs.map((p) => p.warehouseId))];
  const warehouses = await db.warehouse.findMany({ where: { id: { in: whIds } }, select: { id: true, code: true } });
  const liveWh = new Map(warehouses.map((w) => [w.id, w.code]));

  const rows = projs.map((p) => ({ warehouseId: p.warehouseId, warehouseCode: liveWh.get(p.warehouseId) ?? "‹ORPHAN›", onHand: p.onHandQuantity, reserved: p.reservedQuantity, available: p.availableQuantity, availConsistent: Math.abs(p.availableQuantity - (p.onHandQuantity - p.reservedQuantity)) < 1e-6, avgCost: p.averageCost.toNumber(), orphan: !liveWh.has(p.warehouseId) }));
  const orphans = rows.filter((r) => r.orphan);

  let purged: string[] = [];
  if (purge && orphans.length) {
    const orphanWhIds = orphans.map((o) => o.warehouseId);
    const invRecs = await db.inventoryRecord.findMany({ where: { businessId, variantId: variant.id, warehouseId: { in: orphanWhIds } }, select: { id: true } });
    const invIds = invRecs.map((r) => r.id);
    if (invIds.length) {
      await db.reservationRecord.deleteMany({ where: { inventoryId: { in: invIds } } });
      await db.stockMovementRecord.deleteMany({ where: { inventoryId: { in: invIds } } });
      await db.inventoryRecord.deleteMany({ where: { id: { in: invIds } } });
    }
    await db.inventoryVariantProjection.deleteMany({ where: { businessId, variantId: variant.id, warehouseId: { in: orphanWhIds } } });
    purged = orphanWhIds;
  }

  let wacRestored: number | null = null;
  if (setwac != null && setwac !== "") {
    const val = Number(setwac);
    if (!Number.isNaN(val)) {
      // After orphans are purged, set the surviving (real) projections back to the given WAC.
      const liveWhIds = warehouses.map((w) => w.id);
      await db.inventoryVariantProjection.updateMany({ where: { businessId, variantId: variant.id, warehouseId: { in: liveWhIds } }, data: { averageCost: val } });
      wacRestored = val;
    }
  }

  // Active reservation rows on this variant's inventory records (to distinguish leak vs seed).
  const invRecs = await db.inventoryRecord.findMany({ where: { businessId, variantId: variant.id }, select: { id: true, warehouseId: true } });
  const activeReservations = invRecs.length ? await db.reservationRecord.count({ where: { businessId, inventoryId: { in: invRecs.map((r) => r.id) }, status: "ACTIVE" } }) : 0;

  // Repair: recompute reserved = Σ(active reservations for the warehouse's inventory record) and
  // available = onHand − reserved — the definitional projection rebuild. Fixes seed/leaked phantom
  // reserved values that have no backing reservation row (available ≠ onHand − reserved).
  let availableFixed = 0;
  if (url.searchParams.get("fixavailable") === "1") {
    const invByWh = new Map(invRecs.map((r) => [r.warehouseId, r.id]));
    for (const p of projs) {
      if (!liveWh.has(p.warehouseId)) continue;
      const invId = invByWh.get(p.warehouseId);
      const reserved = invId ? (await db.reservationRecord.aggregate({ where: { businessId, inventoryId: invId, status: "ACTIVE" }, _sum: { quantity: true } }))._sum.quantity ?? 0 : 0;
      await db.inventoryVariantProjection.update({ where: { businessId_variantId_warehouseId: { businessId, variantId: variant.id, warehouseId: p.warehouseId } }, data: { reservedQuantity: reserved, availableQuantity: p.onHandQuantity - reserved } });
      availableFixed++;
    }
  }

  const onHandRestored: Record<string, number> = {};
  if (setOnHand) {
    for (const pair of setOnHand.split(",")) {
      const [prefix, qtyStr] = pair.split(":");
      const qty = Number(qtyStr);
      if (!prefix || Number.isNaN(qty)) continue;
      const wh = warehouses.find((w) => w.code.startsWith(prefix));
      if (!wh) continue;
      const cur = projs.find((p) => p.warehouseId === wh.id);
      const reserved = cur?.reservedQuantity ?? 0;
      await db.inventoryVariantProjection.update({ where: { businessId_variantId_warehouseId: { businessId, variantId: variant.id, warehouseId: wh.id } }, data: { onHandQuantity: qty, availableQuantity: qty - reserved } });
      onHandRestored[wh.code] = qty;
    }
  }

  const totalOnHand = rows.reduce((s, r) => s + r.onHand, 0);
  return NextResponse.json({ business: businessId, variant: variant.id, totalOnHand, projectionCount: rows.length, orphanCount: orphans.length, activeReservations, availableFixed, purged, wacRestored, onHandRestored, rows });
}

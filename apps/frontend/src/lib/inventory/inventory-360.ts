/**
 * Inventory 360 — a single composed view of one product variant (mirror of Customer/Vendor 360).
 * Composition only: reuses stock-balance, stock-ledger and the projection; no new stock math.
 * Sections: variant overview, valuation snapshot, per-warehouse balances, reservation history,
 * movement history, and a merged chronological timeline (movements + reservation lifecycle).
 */
import { db } from "@/lib/db";
import { getStockBalance } from "./stock-balance";
import { getStockLedger, type StockLedgerLine } from "./stock-ledger";
import { resolveVariantMeta, resolveWarehouseMeta, round2 } from "./inventory-utils";

export interface Inventory360TimelineEvent {
  date: Date;
  kind: "Movement" | "Reservation";
  label: string;
  detail: string;
}

export interface Inventory360 {
  variant: { id: string; name: string; sku: string; product: string; unit: string; cost: number; price: number };
  summary: { onHand: number; reserved: number; available: number; averageCost: number; value: number; warehouses: number; movements: number; activeReservations: number };
  warehouseBalances: { warehouse: string; onHand: number; reserved: number; available: number; averageCost: number; value: number; status: string }[];
  reservations: { reference: string; quantity: number; status: string; warehouse: string; createdAt: Date; expiresAt: Date }[];
  movements: StockLedgerLine[];
  timeline: Inventory360TimelineEvent[];
}

export async function getInventory360(businessId: string, variantId: string): Promise<Inventory360 | null> {
  const variantMeta = await resolveVariantMeta(businessId);
  const vm = variantMeta.get(variantId);
  if (!vm) return null;

  const [balance, ledger, warehouseMeta, invRecords] = await Promise.all([
    getStockBalance(businessId),
    getStockLedger(businessId, variantId),
    resolveWarehouseMeta(businessId),
    db.inventoryRecord.findMany({ where: { businessId, variantId }, select: { id: true, warehouseId: true } }),
  ]);

  const myRows = balance.rows.filter((r) => r.variantId === variantId);
  const invIds = invRecords.map((r) => r.id);
  const whByInv = new Map(invRecords.map((r) => [r.id, warehouseMeta.get(r.warehouseId)?.name ?? "—"]));

  const reservationRows = invIds.length
    ? await db.reservationRecord.findMany({ where: { businessId, inventoryId: { in: invIds } }, orderBy: { createdAt: "desc" } })
    : [];

  const onHand = round2(myRows.reduce((s, r) => s + r.onHand, 0));
  const reserved = round2(myRows.reduce((s, r) => s + r.reserved, 0));
  const available = round2(myRows.reduce((s, r) => s + r.available, 0));
  const value = round2(myRows.reduce((s, r) => s + r.value, 0));
  const averageCost = onHand > 0 ? round2(value / onHand) : 0;
  const activeReservations = reservationRows.filter((r) => r.status === "ACTIVE").length;

  const reservations = reservationRows.map((r) => ({
    reference: r.referenceId,
    quantity: r.quantity,
    status: r.status,
    warehouse: whByInv.get(r.inventoryId) ?? "—",
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
  }));

  const movements = ledger?.lines.slice(-50).reverse() ?? [];

  // Merged timeline (newest first): movements + reservation lifecycle events.
  const timeline: Inventory360TimelineEvent[] = [
    ...(ledger?.lines ?? []).map((l) => ({
      date: l.date,
      kind: "Movement" as const,
      label: l.type,
      detail: `${l.quantity >= 0 ? "+" : ""}${l.quantity} ${vm.unit} @ ${l.warehouse} (${l.reference})`,
    })),
    ...reservationRows.map((r) => ({
      date: r.createdAt,
      kind: "Reservation" as const,
      label: `Reservation ${r.status}`,
      detail: `${r.quantity} ${vm.unit} for ${r.referenceId} @ ${whByInv.get(r.inventoryId) ?? "—"}`,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 60);

  return {
    variant: { id: variantId, name: vm.variant, sku: vm.sku, product: vm.product, unit: vm.unit, cost: vm.cost, price: vm.price },
    summary: { onHand, reserved, available, averageCost, value, warehouses: myRows.length, movements: ledger?.movementCount ?? 0, activeReservations },
    warehouseBalances: myRows.map((r) => ({ warehouse: r.warehouse, onHand: r.onHand, reserved: r.reserved, available: r.available, averageCost: r.averageCost, value: r.value, status: r.status })),
    reservations,
    movements,
    timeline,
  };
}

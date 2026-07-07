/**
 * InventoryBalance (Read Model / Projection)
 * This is strictly a read model derived from StockMovements and Reservations.
 * It is NOT a Domain Entity.
 * Rebuilt by replaying StockMovement ledgers.
 */
export interface InventoryBalance {
  inventoryId: string;
  productId: string;
  warehouseId: string;
  totalReceived: number;
  totalIssued: number;
  currentAvailable: number; // Math: totalReceived - totalIssued - reservedQuantity
  reservedQuantity: number;
  unitOfMeasure: string;
  lastUpdated: Date;
}

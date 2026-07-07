export interface InventoryDashboardView {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  warehouseCount: number;
  reservedQuantity: number;
  recentMovements: Array<{ timestamp: Date; description: string }>;
}

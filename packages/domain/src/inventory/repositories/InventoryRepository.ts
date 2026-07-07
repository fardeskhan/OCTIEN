import { Inventory } from '../aggregate/Inventory';
import { InventoryId } from '../value-objects/InventoryId';
import { ProductId } from '../value-objects/ProductId';
import { WarehouseId } from '../value-objects/WarehouseId';
import { StockMovement } from '../entities/StockMovement';

/**
 * Domain-Driven Repository Contract for Inventory.
 * Strictly avoids CRUD terminology.
 */
export interface InventoryRepository {
  findInventory(productId: ProductId, warehouseId: WarehouseId): Promise<Inventory | null>;
  findById(inventoryId: InventoryId): Promise<Inventory | null>;
  appendMovement(movement: StockMovement): Promise<void>;
  saveNewInventory(inventory: Inventory): Promise<void>;
}

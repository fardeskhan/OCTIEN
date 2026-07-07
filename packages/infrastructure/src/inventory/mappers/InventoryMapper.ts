import { InventoryRecord, StockMovementRecord } from '@prisma/client';
import { Inventory } from 'domain/src/inventory/aggregate/Inventory';
import { InventoryId } from 'domain/src/inventory/value-objects/InventoryId';
import { ProductId } from 'domain/src/inventory/value-objects/ProductId';
import { WarehouseId } from 'domain/src/inventory/value-objects/WarehouseId';

/**
 * Persistence Mapper for Inventory Aggregate
 * Secures the boundary so that Prisma types never bleed into the Domain Layer.
 */
export class InventoryMapper {
  public static toDomain(record: InventoryRecord, movements: StockMovementRecord[]): Inventory {
    // Utilize a reconstruction method to instantiate the domain object 
    // without triggering standard business "initialization" events.
    const inventory = (Inventory as any).reconstitute({
      id: InventoryId.fromString(record.id),
      businessId: record.businessId,
      productId: ProductId.fromString(record.productId),
      warehouseId: WarehouseId.fromString(record.warehouseId),
      version: record.version
    });

    return inventory;
  }

  public static toPersistence(inventory: Inventory): Omit<InventoryRecord, 'createdAt' | 'updatedAt'> {
    return {
      id: inventory.id.value,
      businessId: inventory.businessId,
      productId: inventory.productId.value,
      warehouseId: inventory.warehouseId.value,
      version: inventory.version
    };
  }
}

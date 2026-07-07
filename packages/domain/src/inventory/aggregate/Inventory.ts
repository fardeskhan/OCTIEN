import { AggregateRoot } from '../../shared/AggregateRoot';
import { InventoryId } from '../value-objects/InventoryId';
import { ProductId } from '../value-objects/ProductId';
import { WarehouseId } from '../value-objects/WarehouseId';
import { Quantity } from '../value-objects/Quantity';
import { MovementType } from '../value-objects/MovementType';
import { StockMovement } from '../entities/StockMovement';
import { Reservation } from '../entities/Reservation';
import { BatchId } from '../value-objects/BatchId';

/**
 * Inventory Aggregate Root
 * Coordinates StockMovements and Reservations.
 * Does NOT hold intrinsic Balance; Balance is a projection derived from the ledger.
 */
export class Inventory extends AggregateRoot<InventoryId> {
  private constructor(
    public readonly id: InventoryId,
    public readonly businessId: string,
    public readonly productId: ProductId,
    public readonly warehouseId: WarehouseId
  ) {
    super();
  }

  public static initialize(props: {
    businessId: string;
    productId: ProductId;
    warehouseId: WarehouseId;
  }): Inventory {
    const inventory = new Inventory(
      InventoryId.generate(),
      props.businessId,
      props.productId,
      props.warehouseId
    );
    inventory.addDomainEvent({ type: 'Inventory.Created', payload: { inventoryId: inventory.id.value } });
    return inventory;
  }

  public receiveStock(quantity: Quantity, actor: string, batchId?: BatchId): StockMovement {
    const movement = StockMovement.append({
      businessId: this.businessId,
      inventoryId: this.id,
      productId: this.productId,
      warehouseId: this.warehouseId,
      batchId: batchId,
      quantity: quantity,
      type: MovementType.RECEIVE,
      actor: actor
    });
    this.addDomainEvent({ type: 'Stock.Received', payload: { inventoryId: this.id.value, quantity: quantity.value } });
    return movement;
  }

  public reserveStock(quantity: Quantity, referenceId: string, expiresAt: Date, actor: string): Reservation {
    // Note: Application Services use CanReserveStockSpecification against the InventoryBalance Projection before calling this.
    const reservation = Reservation.create({
      inventoryId: this.id,
      quantity: quantity,
      referenceId: referenceId,
      expiresAt: expiresAt
    });
    
    // Log movement for reservation tracking
    StockMovement.append({
      businessId: this.businessId,
      inventoryId: this.id,
      productId: this.productId,
      warehouseId: this.warehouseId,
      quantity: quantity,
      type: MovementType.RESERVATION,
      actor: actor,
      correlationId: reservation.id
    });
    
    this.addDomainEvent({ type: 'Stock.Reserved', payload: { inventoryId: this.id.value, quantity: quantity.value } });
    return reservation;
  }

  public transferStock(quantity: Quantity, destinationWarehouseId: WarehouseId, actor: string): StockMovement[] {
    const transferOut = StockMovement.append({
      businessId: this.businessId,
      inventoryId: this.id,
      productId: this.productId,
      warehouseId: this.warehouseId,
      quantity: quantity,
      type: MovementType.TRANSFER_OUT,
      actor: actor
    });

    // In a real application, the destination inventory would receive the TRANSFER_IN event.
    // This aggregate just handles its own outflow here, while domain events trigger the other side.
    this.addDomainEvent({ type: 'Stock.TransferredOut', payload: { inventoryId: this.id.value, destinationId: destinationWarehouseId.value, quantity: quantity.value } });
    
    return [transferOut];
  }

  public adjustStock(quantityDelta: Quantity, actor: string, reason: string): StockMovement {
    const movement = StockMovement.append({
      businessId: this.businessId,
      inventoryId: this.id,
      productId: this.productId,
      warehouseId: this.warehouseId,
      quantity: quantityDelta,
      type: MovementType.ADJUSTMENT,
      actor: actor,
      metadata: { reason }
    });
    this.addDomainEvent({ type: 'Stock.Adjusted', payload: { inventoryId: this.id.value, quantityDelta: quantityDelta.value } });
    return movement;
  }
}

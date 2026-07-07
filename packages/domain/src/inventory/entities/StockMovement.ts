import { MovementType } from '../value-objects/MovementType';
import { Quantity } from '../value-objects/Quantity';
import { InventoryId } from '../value-objects/InventoryId';
import { ProductId } from '../value-objects/ProductId';
import { WarehouseId } from '../value-objects/WarehouseId';
import { BatchId } from '../value-objects/BatchId';
import { randomUUID } from 'crypto';

/**
 * StockMovement (Immutable Ledger Entry)
 * 
 * Schema:
 * - movementId: Unique UUID for the ledger entry.
 * - businessId: The multi-tenant isolation key.
 * - inventoryId: The aggregate root this movement belongs to.
 * - productId: The item being moved.
 * - warehouseId: Location tracking (Supports Hierarchy: Zone -> Bin via future location extensions).
 * - batchId: The specific lifecycle batch (e.g., UCO moisture batch, Cola expiry).
 * - quantity: The unit-aware amount (can be positive or negative).
 * - type: Strongly typed enumeration (RECEIVE, ISSUE, etc).
 * - timestamp: When the movement occurred.
 * - actor: The user or system that caused the movement.
 * - correlationId: Groups related operations (e.g., TRANSFER_OUT and TRANSFER_IN share this).
 * - causationId: Links one event to the action that caused it (e.g., SalesOrderId).
 * - metadata: Extensibility JSON for future integrations without schema changes.
 * 
 * Invariants:
 * - NEVER updated.
 * - NEVER deleted.
 * - Corrections are made via Appending a new COUNT_CORRECTION or ADJUSTMENT.
 */
export class StockMovement {
  private constructor(
    public readonly movementId: string,
    public readonly businessId: string,
    public readonly inventoryId: InventoryId,
    public readonly productId: ProductId,
    public readonly warehouseId: WarehouseId,
    public readonly batchId: BatchId | null,
    public readonly quantity: Quantity,
    public readonly type: MovementType,
    public readonly timestamp: Date,
    public readonly actor: string,
    public readonly correlationId: string | null,
    public readonly causationId: string | null,
    public readonly metadata: Record<string, any>
  ) {}

  public static append(props: {
    businessId: string;
    inventoryId: InventoryId;
    productId: ProductId;
    warehouseId: WarehouseId;
    batchId?: BatchId;
    quantity: Quantity;
    type: MovementType;
    actor: string;
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, any>;
  }): StockMovement {
    return new StockMovement(
      randomUUID(),
      props.businessId,
      props.inventoryId,
      props.productId,
      props.warehouseId,
      props.batchId || null,
      props.quantity,
      props.type,
      new Date(),
      props.actor,
      props.correlationId || null,
      props.causationId || null,
      props.metadata || {}
    );
  }
}

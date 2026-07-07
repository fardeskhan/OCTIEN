import { AggregateRoot } from '@cosmy/shared-kernel/src/domain/AggregateRoot';
import { GoodsReceiptCreatedDomainEvent } from '../events/PurchasingDomainEvents';

export class GoodsReceiptLine {
  constructor(
    public readonly id: string,
    public readonly productId: string,
    public readonly warehouseId: string,
    public readonly quantity: number,
    public readonly unitCost: number,
    public readonly currency: string
  ) {}
}

export class GoodsReceipt extends AggregateRoot<string> {
  private constructor(
    id: string,
    public readonly receiptNumber: string,
    public readonly businessId: string,
    public readonly purchaseOrderId: string,
    public readonly supplierId: string,
    public readonly lines: GoodsReceiptLine[],
    public readonly receivedAt: Date
  ) {
    super(id);
    
    // Immutable upon creation to preserve physical audit trails.
    // Emits internal Domain Event immediately for Application Layer translation to Integration Event.
    this.addDomainEvent(new GoodsReceiptCreatedDomainEvent(
      this.id,
      this.receiptNumber,
      this.purchaseOrderId,
      this.supplierId,
      this.lines.map(l => ({
        productId: l.productId,
        warehouseId: l.warehouseId,
        quantity: l.quantity,
        unitCost: l.unitCost,
        currency: l.currency
      }))
    ));
  }

  public static create(
    id: string,
    receiptNumber: string,
    businessId: string,
    purchaseOrderId: string,
    supplierId: string,
    lines: GoodsReceiptLine[],
    receivedAt: Date = new Date()
  ): GoodsReceipt {
    if (lines.length === 0) throw new Error('GoodsReceipt must contain at least one line.');
    
    return new GoodsReceipt(id, receiptNumber, businessId, purchaseOrderId, supplierId, lines, receivedAt);
  }

  // Intentionally omitting any setters. A GoodsReceipt is immutable.
  // Corrections require returns/adjustments.
}

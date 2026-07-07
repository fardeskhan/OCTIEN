import { DomainEvent } from '@cosmy/shared-kernel/src/domain/DomainEvent';

/**
 * INTERNAL Domain Events
 * These events coordinate logic strictly inside the Purchasing bounded context.
 * They do NOT conform to EventEnvelope and are not pushed to the message broker directly.
 */

export class SupplierCreatedDomainEvent extends DomainEvent {
  constructor(
    public readonly supplierId: string,
    public readonly name: string,
    public readonly currency: string
  ) {
    super();
  }
}

export class PurchaseOrderApprovedDomainEvent extends DomainEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly supplierId: string
  ) {
    super();
  }
}

export class GoodsReceiptCreatedDomainEvent extends DomainEvent {
  constructor(
    public readonly goodsReceiptId: string,
    public readonly goodsReceiptNumber: string,
    public readonly purchaseOrderId: string,
    public readonly supplierId: string,
    public readonly lines: {
      productId: string;
      warehouseId: string;
      quantity: number;
      unitCost: number; // Pre-resolved PO negotiated price
      currency: string;
    }[]
  ) {
    super();
  }
}

export class PurchaseOrderClosedDomainEvent extends DomainEvent {
  constructor(
    public readonly purchaseOrderId: string
  ) {
    super();
  }
}

import { EventEnvelope } from '@cosmy/shared-kernel/src/events/EventEnvelope';

/**
 * EXTERNAL Integration Events
 * These conform to the strict enterprise tracing contract.
 * They are appended to the Outbox by application handlers and consumed by downstream capabilities.
 */

export interface GoodsReceivedPayload {
  goodsReceiptId: string;
  goodsReceiptNumber: string;
  purchaseOrderId: string;
  supplierId: string;
  lines: {
    productId: string;
    warehouseId: string;
    quantity: number;
    unitCost: number;
    currency: string;
  }[];
}

export class PurchasingGoodsReceivedIntegrationEvent implements EventEnvelope<GoodsReceivedPayload> {
  public readonly eventType = 'Purchasing.GoodsReceived';

  constructor(
    public readonly eventId: string,
    public readonly occurredAt: string,
    public readonly businessId: string,
    public readonly tenantId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly correlationId: string,
    public readonly causationId: string,
    public readonly actorId: string,
    public readonly payloadVersion: string,
    public readonly payload: GoodsReceivedPayload
  ) {}
}

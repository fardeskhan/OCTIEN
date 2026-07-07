import { IPurchasingUnitOfWork } from '../contracts/IPurchasingUnitOfWork';
import { GoodsReceipt, GoodsReceiptLine } from '@cosmy/domain/src/purchasing/aggregates/GoodsReceipt';
import { PurchaseQuantity } from '@cosmy/domain/src/purchasing/value-objects/PurchaseQuantity';
import { PurchasingGoodsReceivedIntegrationEvent } from '../events/PurchasingIntegrationEvents';
import { randomUUID } from 'crypto';

export class ReceiveGoodsCommand {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly goodsReceiptNumber: string,
    public readonly receiptLines: {
      productId: string;
      warehouseId: string;
      quantity: number;
      unitOfMeasure: string;
    }[],
    public readonly actorId: string,
    public readonly correlationId: string
  ) {}
}

export class ReceiveGoodsHandler {
  constructor(private readonly uow: IPurchasingUnitOfWork) {}

  public async handle(command: ReceiveGoodsCommand): Promise<void> {
    await this.uow.begin();

    try {
      // 1. Idempotency Check: Prevent duplicate processing of the same truck receipt
      const isDuplicate = await this.uow.goodsReceipts.existsByReceiptNumber(command.goodsReceiptNumber);
      if (isDuplicate) {
        // Idempotent return - silently acknowledge duplicate without failure to satisfy retry loops gracefully
        await this.uow.rollback();
        return;
      }

      const purchaseOrder = await this.uow.purchaseOrders.findById(command.purchaseOrderId);
      if (!purchaseOrder) throw new Error(`Purchase Order ${command.purchaseOrderId} not found.`);

      // 2. Format Receipt Input leveraging Value Objects for precision
      const receiptQuantities = command.receiptLines.map(line => ({
        productId: line.productId,
        receivedQuantity: PurchaseQuantity.create(line.quantity, line.unitOfMeasure)
      }));

      // 3. Mutate the PO State Machine (Draft -> Approved -> PartiallyReceived -> Received)
      purchaseOrder.registerGoodsReceipt(receiptQuantities);

      // 4. Extract negotiated unit costs from PO to stamp into the GoodsReceipt physically
      const goodsReceiptLines = command.receiptLines.map(line => {
        const poLine = purchaseOrder.getLines().find(l => l.productId === line.productId);
        if (!poLine) throw new Error(`PO Line missing for product ${line.productId}`);
        
        return new GoodsReceiptLine(
          randomUUID(),
          line.productId,
          line.warehouseId,
          line.quantity,
          poLine.unitCost.amount.toNumber(),
          poLine.unitCost.currency
        );
      });

      // 5. Create immutable GoodsReceipt
      const goodsReceipt = GoodsReceipt.create(
        randomUUID(),
        command.goodsReceiptNumber,
        purchaseOrder.businessId,
        purchaseOrder.id,
        purchaseOrder.supplierId,
        goodsReceiptLines
      );

      // 6. Map Domain Event -> Cross-Context Integration Event exactly matching the universal envelope
      const integrationEvent = new PurchasingGoodsReceivedIntegrationEvent(
        randomUUID(),
        new Date().toISOString(),
        purchaseOrder.businessId,
        'tenant_001',
        goodsReceipt.id,
        goodsReceipt.version,
        command.correlationId,
        command.goodsReceiptNumber,
        command.actorId,
        '1.0',
        {
          goodsReceiptId: goodsReceipt.id,
          goodsReceiptNumber: goodsReceipt.receiptNumber,
          purchaseOrderId: purchaseOrder.id,
          supplierId: purchaseOrder.supplierId,
          lines: goodsReceiptLines.map(l => ({
            productId: l.productId,
            warehouseId: l.warehouseId,
            quantity: l.quantity,
            unitCost: l.unitCost,
            currency: l.currency
          }))
        }
      );

      // 7. Atomically save the Aggregate mutations alongside the Outbox Integration Event
      await this.uow.purchaseOrders.save(purchaseOrder);
      await this.uow.goodsReceipts.save(goodsReceipt);
      await this.uow.outbox.append([integrationEvent]);

      await this.uow.commit();
    } catch (error) {
      await this.uow.rollback();
      throw error;
    }
  }
}

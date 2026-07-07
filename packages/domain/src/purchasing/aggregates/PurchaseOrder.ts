import { AggregateRoot } from '@cosmy/shared-kernel/src/domain/AggregateRoot';
import { PurchaseOrderStatus } from '../value-objects/PurchaseOrderStatus';
import { PurchaseQuantity } from '../value-objects/PurchaseQuantity';
import { PurchaseOrderApprovedDomainEvent, PurchaseOrderClosedDomainEvent } from '../events/PurchasingDomainEvents';
import { Money } from '@cosmy/shared-kernel/src/value-objects/Money';

export class PurchaseOrderLine {
  constructor(
    public readonly id: string,
    public readonly productId: string,
    public readonly orderedQuantity: PurchaseQuantity,
    public readonly unitCost: Money,
    public receivedQuantity: PurchaseQuantity
  ) {}

  public isFullyReceived(): boolean {
    return this.receivedQuantity.isGreaterThanOrEqual(this.orderedQuantity);
  }

  public registerReceipt(quantity: PurchaseQuantity): void {
    this.receivedQuantity = this.receivedQuantity.add(quantity);
  }
}

export class PurchaseOrder extends AggregateRoot<string> {
  public status: PurchaseOrderStatus = PurchaseOrderStatus.DRAFT;
  private lines: PurchaseOrderLine[] = [];

  private constructor(
    id: string,
    public readonly businessId: string,
    public readonly supplierId: string,
    public readonly expectedDeliveryDate: Date
  ) {
    super(id);
  }

  public static create(id: string, businessId: string, supplierId: string, deliveryDate: Date): PurchaseOrder {
    return new PurchaseOrder(id, businessId, supplierId, deliveryDate);
  }

  public addLine(line: PurchaseOrderLine): void {
    if (this.status !== PurchaseOrderStatus.DRAFT) {
      throw new Error('Can only add lines to DRAFT purchase orders.');
    }
    this.lines.push(line);
  }

  public getLines(): PurchaseOrderLine[] {
    return [...this.lines];
  }

  public requestApproval(): void {
    if (this.status !== PurchaseOrderStatus.DRAFT) throw new Error('Only DRAFT POs can request approval.');
    if (this.lines.length === 0) throw new Error('Cannot approve empty PO.');
    this.status = PurchaseOrderStatus.PENDING_APPROVAL;
  }

  public approve(): void {
    if (this.status !== PurchaseOrderStatus.PENDING_APPROVAL) throw new Error('Only PENDING_APPROVAL POs can be approved.');
    this.status = PurchaseOrderStatus.APPROVED;
    this.addDomainEvent(new PurchaseOrderApprovedDomainEvent(this.id, this.supplierId));
  }

  public registerGoodsReceipt(receiptLines: { productId: string; receivedQuantity: PurchaseQuantity }[]): void {
    if (![PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.PARTIALLY_RECEIVED].includes(this.status)) {
      throw new Error('Can only receive goods against APPROVED or PARTIALLY_RECEIVED POs.');
    }

    for (const receiptLine of receiptLines) {
      const poLine = this.lines.find(l => l.productId === receiptLine.productId);
      if (!poLine) throw new Error(`Product ${receiptLine.productId} not found on PO.`);
      
      poLine.registerReceipt(receiptLine.receivedQuantity);
    }

    const allReceived = this.lines.every(l => l.isFullyReceived());
    const anyReceived = this.lines.some(l => l.receivedQuantity.value > 0);

    if (allReceived) {
      this.status = PurchaseOrderStatus.RECEIVED;
    } else if (anyReceived) {
      this.status = PurchaseOrderStatus.PARTIALLY_RECEIVED;
    }
  }

  public close(): void {
    if (![PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.PARTIALLY_RECEIVED].includes(this.status)) {
      throw new Error('Can only close received POs.');
    }
    this.status = PurchaseOrderStatus.CLOSED;
    this.addDomainEvent(new PurchaseOrderClosedDomainEvent(this.id));
  }

  public cancel(): void {
    if (this.status === PurchaseOrderStatus.PARTIALLY_RECEIVED || this.status === PurchaseOrderStatus.RECEIVED || this.status === PurchaseOrderStatus.CLOSED) {
      throw new Error('Cannot cancel a PO that has already received goods. Use return workflows.');
    }
    this.status = PurchaseOrderStatus.CANCELLED;
  }
}

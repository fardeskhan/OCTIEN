import { AggregateRoot } from '@cosmy/shared-kernel/src/domain/AggregateRoot';
import { DomainEvent } from '@cosmy/shared-kernel/src/domain/DomainEvent';

export enum OrderState {
  DRAFT = 'DRAFT',
  QUOTED = 'QUOTED',
  APPROVED = 'APPROVED',
  CONFIRMED = 'CONFIRMED',
  PARTIALLY_SHIPPED = 'PARTIALLY_SHIPPED',
  SHIPPED = 'SHIPPED',
  INVOICED = 'INVOICED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED'
}

export class OrderLine {
  constructor(
    public readonly id: string,
    public readonly productId: string,
    public quantity: number,
    public unitPrice: number,
    public taxRate: number
  ) {}

  public get lineTotal(): number {
    return (this.quantity * this.unitPrice) * (1 + this.taxRate);
  }
}

export class CustomerOrder extends AggregateRoot<string> {
  private lines: OrderLine[] = [];
  public reservationReferences: string[] = [];
  public shipmentReferences: string[] = [];
  public invoiceReferences: string[] = [];
  public paymentReferences: string[] = [];

  private constructor(
    id: string,
    public readonly customerId: string,
    public readonly businessId: string,
    public readonly currency: string,
    public state: OrderState
  ) {
    super(id);
  }

  public static draft(id: string, customerId: string, businessId: string, currency: string): CustomerOrder {
    const order = new CustomerOrder(id, customerId, businessId, currency, OrderState.DRAFT);
    order.addDomainEvent(new OrderDraftedEvent(id));
    return order;
  }

  public addLine(line: OrderLine): void {
    if (this.state !== OrderState.DRAFT && this.state !== OrderState.QUOTED) {
      throw new Error('Cannot modify lines once approved or confirmed.');
    }
    this.lines.push(line);
  }

  public get orderTotal(): number {
    return this.lines.reduce((total, line) => total + line.lineTotal, 0);
  }

  public approve(): void {
    if (this.state !== OrderState.QUOTED && this.state !== OrderState.DRAFT) throw new Error('Invalid state transition');
    this.state = OrderState.APPROVED;
    this.addDomainEvent(new OrderApprovedEvent(this.id));
  }

  public confirm(): void {
    if (this.state !== OrderState.APPROVED) throw new Error('Order must be approved before confirmation');
    this.state = OrderState.CONFIRMED;
    this.addDomainEvent(new OrderConfirmedEvent(this.id));
  }

  public markShipped(shipmentId: string, isPartial: boolean): void {
    this.shipmentReferences.push(shipmentId);
    this.state = isPartial ? OrderState.PARTIALLY_SHIPPED : OrderState.SHIPPED;
  }

  public markInvoiced(invoiceId: string): void {
    this.invoiceReferences.push(invoiceId);
    this.state = OrderState.INVOICED;
  }

  public cancel(reason: string): void {
    if (this.state === OrderState.SHIPPED || this.state === OrderState.INVOICED || this.state === OrderState.CLOSED) {
      throw new Error('Cannot cancel a fulfilled order. Must use Returns process.');
    }
    this.state = OrderState.CANCELLED;
    this.addDomainEvent(new OrderCancelledEvent(this.id, reason));
  }
}

export class OrderDraftedEvent extends DomainEvent { constructor(public readonly orderId: string) { super(); } }
export class OrderApprovedEvent extends DomainEvent { constructor(public readonly orderId: string) { super(); } }
export class OrderConfirmedEvent extends DomainEvent { constructor(public readonly orderId: string) { super(); } }
export class OrderCancelledEvent extends DomainEvent { constructor(public readonly orderId: string, public readonly reason: string) { super(); } }

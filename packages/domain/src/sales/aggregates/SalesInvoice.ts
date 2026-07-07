import { AggregateRoot } from '@cosmy/shared-kernel/src/domain/AggregateRoot';
import { DomainEvent } from '@cosmy/shared-kernel/src/domain/DomainEvent';

export enum InvoiceState {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  VOIDED = 'VOIDED'
}

export class SalesInvoiceLine {
  constructor(
    public readonly description: string,
    public readonly productId: string | null,
    public readonly quantity: number,
    public readonly unitPrice: number,
    public readonly taxAmount: number
  ) {}

  public get lineTotal(): number {
    return (this.quantity * this.unitPrice) + this.taxAmount;
  }
}

export class SalesInvoice extends AggregateRoot<string> {
  private lines: SalesInvoiceLine[] = [];
  public amountPaid: number = 0;

  private constructor(
    id: string,
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly currency: string,
    public state: InvoiceState,
    public issuedAt: Date | null,
    public dueDate: Date | null
  ) {
    super(id);
  }

  public static draft(id: string, orderId: string, customerId: string, currency: string): SalesInvoice {
    return new SalesInvoice(id, orderId, customerId, currency, InvoiceState.DRAFT, null, null);
  }

  public addLine(line: SalesInvoiceLine): void {
    if (this.state !== InvoiceState.DRAFT) throw new Error('Cannot add lines to an issued invoice.');
    this.lines.push(line);
  }

  public get totalAmount(): number {
    return this.lines.reduce((acc, line) => acc + line.lineTotal, 0);
  }

  public issue(dueDate: Date): void {
    if (this.state !== InvoiceState.DRAFT) throw new Error('Invoice is already issued');
    this.state = InvoiceState.ISSUED;
    this.issuedAt = new Date();
    this.dueDate = dueDate;
    this.addDomainEvent(new SalesInvoiceIssuedEvent(this.id, this.orderId, this.totalAmount));
  }

  public recordPayment(amount: number): void {
    if (this.state !== InvoiceState.ISSUED && this.state !== InvoiceState.PARTIALLY_PAID) {
      throw new Error('Cannot record payment for unissued or paid invoice.');
    }
    
    this.amountPaid += amount;
    
    if (this.amountPaid >= this.totalAmount) {
      this.state = InvoiceState.PAID;
      this.addDomainEvent(new SalesInvoicePaidEvent(this.id));
    } else {
      this.state = InvoiceState.PARTIALLY_PAID;
    }
  }

  public voidInvoice(): void {
    if (this.state === InvoiceState.PAID) throw new Error('Cannot void a paid invoice');
    this.state = InvoiceState.VOIDED;
    this.addDomainEvent(new SalesInvoiceVoidedEvent(this.id));
  }
}

export class SalesInvoiceIssuedEvent extends DomainEvent { 
  constructor(public readonly invoiceId: string, public readonly orderId: string, public readonly amount: number) { super(); } 
}
export class SalesInvoicePaidEvent extends DomainEvent { 
  constructor(public readonly invoiceId: string) { super(); } 
}
export class SalesInvoiceVoidedEvent extends DomainEvent { 
  constructor(public readonly invoiceId: string) { super(); } 
}

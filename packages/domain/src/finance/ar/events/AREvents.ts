export interface AREvent {
  eventId: string;
  eventName: string;
  version: string;
  timestamp: string;
  tenantId: string;
}

export class CustomerAccountCreated implements AREvent {
  public readonly eventName = 'CustomerAccountCreated';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly customerId: string,
    public readonly creditLimit: string
  ) {}
}

export class ReceivableInvoiceApproved implements AREvent {
  public readonly eventName = 'ReceivableInvoiceApproved';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly invoiceId: string,
    public readonly customerId: string,
    public readonly amount: string,
    public readonly currency: string
  ) {}
}

export class ReceiptPosted implements AREvent {
  public readonly eventName = 'ReceiptPosted';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly receiptId: string,
    public readonly customerId: string,
    public readonly amount: string,
    public readonly currency: string
  ) {}
}

export class InvoiceAllocationCreated implements AREvent {
  public readonly eventName = 'InvoiceAllocationCreated';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly allocationId: string,
    public readonly receiptId: string,
    public readonly invoiceId: string,
    public readonly amount: string
  ) {}
}

export class InvoiceAllocationReversed implements AREvent {
  public readonly eventName = 'InvoiceAllocationReversed';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly originalAllocationId: string,
    public readonly reversalAllocationId: string
  ) {}
}

export class WriteOffPosted implements AREvent {
  public readonly eventName = 'WriteOffPosted';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly writeOffId: string,
    public readonly invoiceId: string,
    public readonly amount: string
  ) {}
}

export class CreditNotePosted implements AREvent {
  public readonly eventName = 'CreditNotePosted';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly creditNoteId: string,
    public readonly customerId: string,
    public readonly amount: string
  ) {}
}

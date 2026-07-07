export interface APEvent {
  eventId: string;
  eventName: string;
  version: string;
  timestamp: string;
  tenantId: string;
}

export class VendorAccountCreated implements APEvent {
  public readonly eventName = 'VendorAccountCreated';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly vendorId: string
  ) {}
}

export class PayableInvoiceApproved implements APEvent {
  public readonly eventName = 'PayableInvoiceApproved';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly invoiceId: string,
    public readonly vendorId: string,
    public readonly amount: string,
    public readonly currency: string
  ) {}
}

export class PaymentAuthorized implements APEvent {
  public readonly eventName = 'PaymentAuthorized';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly paymentId: string,
    public readonly authorizedBy: string
  ) {}
}

export class PaymentPosted implements APEvent {
  public readonly eventName = 'PaymentPosted';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly paymentId: string,
    public readonly vendorId: string,
    public readonly amount: string,
    public readonly currency: string
  ) {}
}

export class PaymentAllocationCreated implements APEvent {
  public readonly eventName = 'PaymentAllocationCreated';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly allocationId: string,
    public readonly paymentId: string,
    public readonly invoiceId: string,
    public readonly amount: string
  ) {}
}

export class DebitNotePosted implements APEvent {
  public readonly eventName = 'DebitNotePosted';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly debitNoteId: string,
    public readonly vendorId: string,
    public readonly amount: string
  ) {}
}

export class VendorWriteOffPosted implements APEvent {
  public readonly eventName = 'VendorWriteOffPosted';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly writeOffId: string,
    public readonly vendorId: string,
    public readonly amount: string
  ) {}
}

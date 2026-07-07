export interface TaxEvent {
  eventId: string;
  eventName: string;
  version: string;
  timestamp: string;
  tenantId: string;
}

export class TaxDetermined implements TaxEvent {
  public readonly eventName = 'TaxDetermined';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly determinationId: string,
    public readonly sourceDocumentId: string,
    public readonly totalTaxAmount: string
  ) {}
}

export class TaxAdjustmentPosted implements TaxEvent {
  public readonly eventName = 'TaxAdjustmentPosted';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly adjustmentId: string,
    public readonly totalTaxAmount: string
  ) {}
}

export enum VendorStatus {
  ACTIVE = 'ACTIVE',
  HOLD = 'HOLD',
  INACTIVE = 'INACTIVE'
}

export class VendorAccount {
  constructor(
    public readonly vendorId: string,
    public readonly tenantId: string,
    public readonly paymentTerms: string,
    private _status: VendorStatus
  ) {}

  get status(): VendorStatus {
    return this._status;
  }

  public placeOnHold(): void {
    this._status = VendorStatus.HOLD;
  }

  public activate(): void {
    this._status = VendorStatus.ACTIVE;
  }

  // NOTE: Explicitly does NOT store mutable outstanding balance.
  // Validation relies on OpenPayablesProjection and VendorBalanceProjection.
}

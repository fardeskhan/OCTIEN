export enum ForecastAssumptionType {
  CUSTOMER_COLLECTION_DELAY = 'CUSTOMER_COLLECTION_DELAY', // days
  VENDOR_PAYMENT_DELAY = 'VENDOR_PAYMENT_DELAY', // days
  EXPECTED_GROWTH = 'EXPECTED_GROWTH' // percentage
}

export class ForecastAssumption {
  constructor(
    public readonly assumptionId: string,
    public readonly tenantId: string,
    public readonly type: ForecastAssumptionType,
    public readonly value: number
  ) {}
}

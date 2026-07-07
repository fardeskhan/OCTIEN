export interface IFiscalPeriodPolicy {
  isPeriodOpen(businessId: string, fiscalYear: string, fiscalPeriod: string): Promise<boolean>;
}

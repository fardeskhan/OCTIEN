export class CrossCurrencyAllocationNotSupportedException extends Error {
  constructor(receiptCurrency: string, invoiceCurrency: string) {
    super(`Cross-currency allocations are not supported in Phase 1. Receipt Currency: ${receiptCurrency}, Invoice Currency: ${invoiceCurrency}`);
    this.name = 'CrossCurrencyAllocationNotSupportedException';
  }
}

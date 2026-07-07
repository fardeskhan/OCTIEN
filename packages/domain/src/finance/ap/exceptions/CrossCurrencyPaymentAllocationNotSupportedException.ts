export class CrossCurrencyPaymentAllocationNotSupportedException extends Error {
  constructor(paymentCurrency: string, invoiceCurrency: string) {
    super(`Cross-currency payment allocations are not supported in Phase 1. Payment Currency: ${paymentCurrency}, Invoice Currency: ${invoiceCurrency}`);
    this.name = 'CrossCurrencyPaymentAllocationNotSupportedException';
  }
}

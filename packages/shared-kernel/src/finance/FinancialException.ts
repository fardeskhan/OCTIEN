export class FinancialException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FinancialException';
  }
}

export class CurrencyMismatchException extends FinancialException {
  constructor(currencyA: string, currencyB: string) {
    super(`Currency mismatch: Cannot operate on ${currencyA} and ${currencyB} without conversion`);
    this.name = 'CurrencyMismatchException';
  }
}

export class PrecisionOverflowException extends FinancialException {
  constructor(value: string, maxScale: number) {
    super(`Precision overflow: Value ${value} exceeds platform maximum scale of ${maxScale}`);
    this.name = 'PrecisionOverflowException';
  }
}

export class InvalidExchangeRateException extends FinancialException {
  constructor(message: string) {
    super(`Invalid Exchange Rate: ${message}`);
    this.name = 'InvalidExchangeRateException';
  }
}

export class InvalidLedgerHashException extends FinancialException {
  constructor() {
    super('LedgerHash validation failed. Hash is corrupted or manipulated.');
    this.name = 'InvalidLedgerHashException';
  }
}

export class InvalidFiscalDateException extends FinancialException {
  constructor(message: string) {
    super(`Invalid Fiscal Date: ${message}`);
    this.name = 'InvalidFiscalDateException';
  }
}

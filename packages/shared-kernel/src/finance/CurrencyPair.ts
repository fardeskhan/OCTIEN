import { Currency } from './Currency';

export class CurrencyPair {
  constructor(
    public readonly baseCurrency: Currency,
    public readonly quoteCurrency: Currency
  ) {
    if (baseCurrency.equals(quoteCurrency)) {
      throw new Error('CurrencyPair base and quote currencies must be different');
    }
  }

  equals(other: CurrencyPair): boolean {
    return this.baseCurrency.equals(other.baseCurrency) && 
           this.quoteCurrency.equals(other.quoteCurrency);
  }
}

import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';

export class FXRate {
  constructor(
    public readonly fromCurrency: string,
    public readonly toCurrency: string,
    public readonly rate: Decimal,
    public readonly effectiveDate: string
  ) {}
}

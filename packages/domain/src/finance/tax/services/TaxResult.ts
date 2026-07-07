import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';
import { TaxLine } from '../aggregates/TaxDetermination';

export class TaxResult {
  constructor(
    public readonly jurisdictionId: string,
    public readonly taxCodeId: string,
    public readonly taxableAmount: Decimal,
    public readonly totalTaxAmount: Decimal,
    public readonly taxLines: TaxLine[]
  ) {}
}

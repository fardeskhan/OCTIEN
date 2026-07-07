import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';

export interface TaxLine {
  taxLineId: string;
  taxType: string;
  rate: Decimal;
  taxableAmount: Decimal;
  taxAmount: Decimal;
}

export class TaxDetermination {
  constructor(
    public readonly determinationId: string,
    public readonly tenantId: string,
    public readonly sourceDocumentId: string,
    public readonly jurisdictionId: string,
    public readonly transactionDate: string,
    public readonly taxableAmount: Decimal,
    public readonly totalTaxAmount: Decimal,
    public readonly taxLines: TaxLine[]
  ) {}
}

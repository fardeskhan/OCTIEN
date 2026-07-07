import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';

export interface TaxRuleRate {
  taxType: string; // e.g. CGST, SGST
  rate: Decimal;
}

export class TaxRule {
  constructor(
    public readonly ruleId: string,
    public readonly tenantId: string,
    public readonly taxCodeId: string,
    public readonly jurisdictionId: string,
    public readonly effectiveFrom: string, // Date string
    public readonly effectiveTo: string | null, // Date string or null for infinity
    public readonly rates: TaxRuleRate[]
  ) {}
}

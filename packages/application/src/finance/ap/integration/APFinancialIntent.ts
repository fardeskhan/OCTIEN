import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../../shared-kernel/src/finance/Currency';

export type APIntentType = 'PURCHASE' | 'PAYMENT' | 'PURCHASE_RETURN' | 'VENDOR_WRITE_OFF';

export class APFinancialIntent {
  constructor(
    public readonly intentType: APIntentType,
    public readonly sourceDocumentId: string,
    public readonly vendorId: string,
    public readonly amount: Decimal,
    public readonly currency: Currency,
    public readonly postingDate: string,
    public readonly tenantId: string
  ) {}
}

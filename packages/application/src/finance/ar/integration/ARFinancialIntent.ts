import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../../shared-kernel/src/finance/Currency';

export type ARIntentType = 'SALE' | 'PAYMENT' | 'RETURN' | 'WRITE_OFF';

export class ARFinancialIntent {
  constructor(
    public readonly intentType: ARIntentType,
    public readonly sourceDocumentId: string,
    public readonly customerId: string,
    public readonly amount: Decimal,
    public readonly currency: Currency,
    public readonly postingDate: string,
    public readonly tenantId: string
  ) {}
}

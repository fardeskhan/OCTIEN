import { Decimal } from '../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../shared-kernel/src/finance/Currency';

export class CreditNote {
  constructor(
    public readonly creditNoteId: string,
    public readonly tenantId: string,
    public readonly customerId: string,
    public readonly originalAmount: Decimal,
    public readonly currency: Currency,
    public readonly issueDate: string,
    public readonly reason: string
  ) {}
}

import { Decimal } from '../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../shared-kernel/src/finance/Currency';

export class DebitNote {
  constructor(
    public readonly debitNoteId: string,
    public readonly tenantId: string,
    public readonly vendorId: string,
    public readonly originalAmount: Decimal,
    public readonly currency: Currency,
    public readonly issueDate: string,
    public readonly reason: string
  ) {}
}

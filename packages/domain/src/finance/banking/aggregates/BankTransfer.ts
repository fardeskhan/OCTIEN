import { Decimal } from '../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../shared-kernel/src/finance/Currency';

export enum BankTransferType {
  INTERNAL_TRANSFER = 'INTERNAL_TRANSFER',
  EXTERNAL_TRANSFER = 'EXTERNAL_TRANSFER'
}

export class BankTransfer {
  constructor(
    public readonly transferId: string,
    public readonly tenantId: string,
    public readonly sourceBankAccountId: string,
    public readonly targetAccountId: string, // Can be internal bankAccountId or external identifier
    public readonly type: BankTransferType,
    public readonly amount: Decimal,
    public readonly currency: Currency,
    public readonly transferDate: string
  ) {
    if (type === BankTransferType.EXTERNAL_TRANSFER && sourceBankAccountId === targetAccountId) {
        throw new Error('External transfers require an external target.');
    }
  }
}

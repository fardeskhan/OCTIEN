import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../../shared-kernel/src/finance/Currency';

export enum BankingIntentType {
  BANK_DEPOSIT = 'BANK_DEPOSIT',
  BANK_WITHDRAWAL = 'BANK_WITHDRAWAL',
  BANK_TRANSFER = 'BANK_TRANSFER',
  BANK_FEE = 'BANK_FEE',
  BANK_INTEREST = 'BANK_INTEREST',
  BANK_ADJUSTMENT = 'BANK_ADJUSTMENT'
}

export class BankingFinancialIntent {
  constructor(
    public readonly intentType: BankingIntentType,
    public readonly sourceDocumentId: string,
    public readonly bankAccountId: string,
    public readonly amount: Decimal,
    public readonly currency: Currency,
    public readonly postingDate: string,
    public readonly tenantId: string
  ) {}
}

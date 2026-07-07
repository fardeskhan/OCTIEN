import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../../shared-kernel/src/finance/Currency';

export class BankStatementLine {
  constructor(
    public readonly lineId: string,
    public readonly tenantId: string,
    public readonly bankAccountId: string,
    public readonly statementDate: string,
    public readonly amount: Decimal,
    public readonly currency: Currency,
    public readonly reference: string,
    public readonly bankTransactionCode: string
  ) {}
}

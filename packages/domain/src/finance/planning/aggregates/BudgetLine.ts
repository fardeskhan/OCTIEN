import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';

export class BudgetLine {
  constructor(
    public readonly lineId: string,
    public readonly budgetVersionId: string,
    public readonly accountId: string,
    public readonly costCenterId: string,
    public readonly periodId: string,
    public readonly amount: Decimal
  ) {}
}

import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../../shared-kernel/src/finance/Currency';
import { InsufficientLiquidityException } from '../exceptions/InsufficientLiquidityException';
import { PaymentInstruction, PaymentInstructionStatus } from '../payment/PaymentInstruction';

export enum PaymentRunStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  EXECUTING = 'EXECUTING',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export class PaymentRun {
  private _status: PaymentRunStatus = PaymentRunStatus.DRAFT;

  constructor(
    public readonly paymentRunId: string,
    public readonly tenantId: string,
    public readonly instructions: PaymentInstruction[],
    public readonly currency: Currency
  ) {}

  get status(): PaymentRunStatus {
    return this._status;
  }

  get totalAmount(): Decimal {
    const total = this.instructions.reduce((sum, instr) => sum + parseFloat(instr.amount.value), 0);
    return new Decimal(total.toString(), 2, 38);
  }

  public approve(): void {
    if (this._status !== PaymentRunStatus.DRAFT) throw new Error('Invalid transition');
    this._status = PaymentRunStatus.APPROVED;
  }

  public beginExecution(availableLiquidity: Decimal): void {
    if (this._status !== PaymentRunStatus.APPROVED) throw new Error('Invalid transition');
    
    if (parseFloat(availableLiquidity.value) < parseFloat(this.totalAmount.value)) {
      throw new InsufficientLiquidityException(this.paymentRunId, this.totalAmount.value, availableLiquidity.value);
    }
    
    this._status = PaymentRunStatus.EXECUTING;
  }

  public evaluateCompletion(): void {
    if (this._status !== PaymentRunStatus.EXECUTING) throw new Error('Invalid transition');

    const executedCount = this.instructions.filter(i => i.status === PaymentInstructionStatus.EXECUTED).length;
    const failedCount = this.instructions.filter(i => i.status === PaymentInstructionStatus.FAILED).length;
    const totalCount = this.instructions.length;

    if (executedCount === totalCount) {
      this._status = PaymentRunStatus.COMPLETED;
    } else if (failedCount === totalCount) {
      this._status = PaymentRunStatus.FAILED;
    } else {
      this._status = PaymentRunStatus.PARTIALLY_COMPLETED;
    }
  }
}

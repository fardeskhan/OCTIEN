import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../../shared-kernel/src/finance/Currency';

export enum PaymentInstructionStatus {
  CREATED = 'CREATED',
  SUBMITTED = 'SUBMITTED',
  EXECUTED = 'EXECUTED',
  FAILED = 'FAILED'
}

export class PaymentInstruction {
  private _status: PaymentInstructionStatus = PaymentInstructionStatus.CREATED;

  constructor(
    public readonly instructionId: string,
    public readonly paymentRunId: string,
    public readonly vendorId: string,
    public readonly amount: Decimal,
    public readonly currency: Currency,
    public readonly dueDate: string
  ) {}

  get status(): PaymentInstructionStatus {
    return this._status;
  }

  public submit(): void {
    if (this._status !== PaymentInstructionStatus.CREATED) throw new Error('Invalid transition');
    this._status = PaymentInstructionStatus.SUBMITTED;
  }

  public markExecuted(): void {
    if (this._status !== PaymentInstructionStatus.SUBMITTED) throw new Error('Invalid transition');
    this._status = PaymentInstructionStatus.EXECUTED;
  }

  public markFailed(): void {
    if (this._status !== PaymentInstructionStatus.SUBMITTED) throw new Error('Invalid transition');
    this._status = PaymentInstructionStatus.FAILED;
  }
}

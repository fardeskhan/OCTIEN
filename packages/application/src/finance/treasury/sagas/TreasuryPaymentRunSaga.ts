import { PaymentRun } from '../../../../domain/src/finance/treasury/aggregates/PaymentRun';
import { PaymentInstructionStatus } from '../../../../domain/src/finance/treasury/payment/PaymentInstruction';

/**
 * Deterministic Orchestration (Saga/Process Manager) for Payment Runs.
 * Ensures Treasury commands AP and Banking cleanly without them listening to each other.
 */
export class TreasuryPaymentRunSaga {
  
  constructor(
    private bankingAdapter: any,
    private apAdapter: any
  ) {}

  public async executePaymentRun(paymentRun: PaymentRun): Promise<void> {
    for (const instruction of paymentRun.instructions) {
      instruction.submit();

      try {
        // 1. Treasury Orchestrates Banking: ExecuteBankTransferCommand
        await this.bankingAdapter.executeTransfer(instruction);

        // 2. Treasury Orchestrates AP: AllocateVendorPaymentCommand
        await this.apAdapter.allocatePayment(instruction);

        instruction.markExecuted();
      } catch (error) {
        instruction.markFailed();
      }
    }

    paymentRun.evaluateCompletion();
  }
}

export class InsufficientLiquidityException extends Error {
  constructor(paymentRunId: string, requiredAmount: string, availableAmount: string) {
    super(`Cannot execute Payment Run ${paymentRunId}: Insufficient liquidity. Required: ${requiredAmount}, Available: ${availableAmount}`);
    this.name = 'InsufficientLiquidityException';
  }
}

export class PaymentAuthorizationRequiredException extends Error {
  constructor(paymentId: string) {
    super(`Payment ${paymentId} cannot be posted because it lacks AUTHORIZED status.`);
    this.name = 'PaymentAuthorizationRequiredException';
  }
}

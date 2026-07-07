export class BankAccountClosedException extends Error {
  constructor(bankAccountId: string) {
    super(`Cannot post transactions to closed bank account: ${bankAccountId}`);
    this.name = 'BankAccountClosedException';
  }
}

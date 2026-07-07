export class BankAccountFrozenException extends Error {
  constructor(bankAccountId: string) {
    super(`Cannot post transactions to frozen bank account: ${bankAccountId}`);
    this.name = 'BankAccountFrozenException';
  }
}

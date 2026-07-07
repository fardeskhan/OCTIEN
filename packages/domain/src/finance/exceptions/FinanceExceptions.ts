export class FinanceException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class JournalImbalanceException extends FinanceException {}
export class AccountInactiveException extends FinanceException {}
export class ClosedFiscalPeriodException extends FinanceException {}
export class DuplicateAccountCodeException extends FinanceException {}
export class CircularHierarchyException extends FinanceException {}
export class CurrencyMismatchException extends FinanceException {}
export class InvalidJournalStateException extends FinanceException {}
export class JournalAlreadyReversedException extends FinanceException {}
export class ConcurrencyException extends FinanceException {}

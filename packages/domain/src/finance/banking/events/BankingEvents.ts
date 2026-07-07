export interface BankingEvent {
  eventId: string;
  eventName: string;
  version: string;
  timestamp: string;
  tenantId: string;
}

export enum BankTransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  FEE = 'FEE',
  INTEREST = 'INTEREST',
  ADJUSTMENT = 'ADJUSTMENT'
}

export class BankAccountOpened implements BankingEvent {
  public readonly eventName = 'BankAccountOpened';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly bankAccountId: string,
    public readonly currency: string
  ) {}
}

export class BankAccountActivated implements BankingEvent {
  public readonly eventName = 'BankAccountActivated';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly bankAccountId: string
  ) {}
}

export class BankTransactionPosted implements BankingEvent {
  public readonly eventName = 'BankTransactionPosted';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly transactionId: string,
    public readonly bankAccountId: string,
    public readonly transactionType: BankTransactionType,
    public readonly amount: string,
    public readonly currency: string
  ) {}
}

export class BankTransferInitiated implements BankingEvent {
  public readonly eventName = 'BankTransferInitiated';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly transferId: string,
    public readonly sourceBankAccountId: string,
    public readonly targetAccountId: string,
    public readonly transferType: 'INTERNAL_TRANSFER' | 'EXTERNAL_TRANSFER',
    public readonly amount: string,
    public readonly currency: string
  ) {}
}

export class BankReconciliationSessionStarted implements BankingEvent {
  public readonly eventName = 'BankReconciliationSessionStarted';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly sessionId: string,
    public readonly bankAccountId: string
  ) {}
}

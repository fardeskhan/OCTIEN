export interface TreasuryEvent {
  eventId: string;
  eventName: string;
  version: string;
  timestamp: string;
  tenantId: string;
}

export class CashPoolCreated implements TreasuryEvent {
  public readonly eventName = 'CashPoolCreated';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly cashPoolId: string,
    public readonly name: string
  ) {}
}

export class CashForecastGenerated implements TreasuryEvent {
  public readonly eventName = 'CashForecastGenerated';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly forecastId: string,
    public readonly netForecastAmount: string
  ) {}
}

export class PaymentRunExecutionRequested implements TreasuryEvent {
  public readonly eventName = 'PaymentRunExecutionRequested';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly paymentRunId: string,
    public readonly totalAmount: string
  ) {}
}

export class PaymentRunCompleted implements TreasuryEvent {
  public readonly eventName = 'PaymentRunCompleted';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly paymentRunId: string,
    public readonly successfulAmount: string,
    public readonly failedAmount: string
  ) {}
}

export class LiquidityPositionSnapshotted implements TreasuryEvent {
  public readonly eventName = 'LiquidityPositionSnapshotted';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly liquidityId: string,
    public readonly netLiquidity: string
  ) {}
}

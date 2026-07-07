export interface PlanningEvent {
  eventId: string;
  eventName: string;
  version: string;
  timestamp: string;
  tenantId: string;
}

export class BudgetVersionFinalized implements PlanningEvent {
  public readonly eventName = 'BudgetVersionFinalized';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly budgetVersionId: string,
    public readonly budgetId: string
  ) {}
}

export class BudgetLineCommitted implements PlanningEvent {
  public readonly eventName = 'BudgetLineCommitted';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly lineId: string,
    public readonly budgetVersionId: string,
    public readonly accountId: string,
    public readonly costCenterId: string,
    public readonly periodId: string,
    public readonly amount: string
  ) {}
}

export class ForecastUpdated implements PlanningEvent {
  public readonly eventName = 'ForecastUpdated';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly forecastVersionId: string,
    public readonly budgetId: string
  ) {}
}

export class ScenarioCreated implements PlanningEvent {
  public readonly eventName = 'ScenarioCreated';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly scenarioId: string,
    public readonly name: string
  ) {}
}

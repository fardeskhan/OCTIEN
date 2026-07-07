export enum ScenarioType {
  BASE = 'BASE',
  BEST_CASE = 'BEST_CASE',
  WORST_CASE = 'WORST_CASE',
  STRETCH = 'STRETCH'
}

export class Scenario {
  constructor(
    public readonly scenarioId: string,
    public readonly tenantId: string,
    public readonly name: string,
    public readonly type: ScenarioType
  ) {}
}

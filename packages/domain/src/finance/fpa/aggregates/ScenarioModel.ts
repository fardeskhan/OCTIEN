export enum ScenarioModelType {
  BASE = 'BASE',
  BEST_CASE = 'BEST_CASE',
  WORST_CASE = 'WORST_CASE',
  STRETCH = 'STRETCH'
}

export class ScenarioModel {
  constructor(
    public readonly scenarioId: string,
    public readonly name: string,
    public readonly type: ScenarioModelType
  ) {}
}

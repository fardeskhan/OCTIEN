export class ForecastRun {
  public completedAt?: string;

  constructor(
    public readonly runId: string,
    public readonly scenarioId: string,
    public readonly startedAt: string
  ) {}

  public complete(timestamp: string): void {
    this.completedAt = timestamp;
  }
}

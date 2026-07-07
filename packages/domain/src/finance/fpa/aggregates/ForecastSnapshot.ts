export class ForecastSnapshot {
  constructor(
    public readonly snapshotId: string,
    public readonly forecastRunId: string,
    public readonly checksum: string
  ) {}
}

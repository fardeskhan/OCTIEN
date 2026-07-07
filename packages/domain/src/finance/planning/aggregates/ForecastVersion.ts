export enum ForecastVersionStatus {
  DRAFT = 'DRAFT',
  LOCKED = 'LOCKED'
}

export class ForecastVersion {
  private _status: ForecastVersionStatus = ForecastVersionStatus.DRAFT;

  constructor(
    public readonly forecastVersionId: string,
    public readonly forecastId: string,
    public readonly versionNumber: number
  ) {}

  get status(): ForecastVersionStatus {
    return this._status;
  }

  public lock(): void {
    if (this._status !== ForecastVersionStatus.DRAFT) throw new Error('Forecast Version is already locked');
    this._status = ForecastVersionStatus.LOCKED;
  }
}

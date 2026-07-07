export interface ReportingEvent {
  eventId: string;
  eventName: string;
  version: string;
  timestamp: string;
  tenantId: string;
}

export class ReportSnapshotGenerated implements ReportingEvent {
  public readonly eventName = 'ReportSnapshotGenerated';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly snapshotId: string,
    public readonly reportId: string,
    public readonly hash: string
  ) {}
}

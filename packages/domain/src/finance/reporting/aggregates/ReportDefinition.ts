export class ReportDefinition {
  constructor(
    public readonly reportId: string,
    public readonly type: string, // e.g. 'BALANCE_SHEET'
    public readonly name: string,
    public readonly parameters: Record<string, any>,
    public readonly version: string
  ) {}
}

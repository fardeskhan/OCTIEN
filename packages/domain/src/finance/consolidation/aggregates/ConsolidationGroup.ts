export class ConsolidationGroup {
  constructor(
    public readonly groupId: string,
    public readonly name: string,
    public readonly reportingCurrency: string
  ) {}
}

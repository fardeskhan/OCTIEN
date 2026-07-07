export class EliminationRule {
  constructor(
    public readonly ruleId: string,
    public readonly sourceAccount: string,
    public readonly targetAccount: string,
    public readonly varianceAccount: string
  ) {}
}

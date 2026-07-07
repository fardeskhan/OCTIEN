export class FormulaDefinition {
  constructor(
    public readonly formulaId: string,
    public readonly name: string,
    public readonly expression: string,
    public readonly versionId: string
  ) {}
}

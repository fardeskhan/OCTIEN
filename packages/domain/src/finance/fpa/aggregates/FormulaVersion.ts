export class FormulaVersion {
  constructor(
    public readonly versionId: string,
    public readonly formulaId: string,
    public readonly versionNumber: number,
    public readonly expression: string
  ) {}
}

export class BudgetSnapshot {
  constructor(
    public readonly snapshotId: string,
    public readonly budgetVersionId: string,
    public readonly generatedAt: string,
    public readonly checksum: string
  ) {}
}

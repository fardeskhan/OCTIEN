export class PlanningDriver {
  constructor(
    public readonly driverId: string,
    public readonly tenantId: string,
    public readonly type: string, // e.g., Headcount, UnitsSold
    public readonly value: string,
    public readonly effectivePeriod: string
  ) {}
}

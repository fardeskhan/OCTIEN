export class Warehouse {
  constructor(
    public readonly warehouseId: string,
    public readonly tenantId: string,
    public readonly name: string,
    public readonly code: string,
    public readonly status: 'ACTIVE' | 'INACTIVE'
  ) {}
}

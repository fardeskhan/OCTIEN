import { TenantId } from '../../../../shared-kernel/src/domain/value-objects/TenantId';

export class SyncTransactionsCommand {
  constructor(
    public readonly tenantId: TenantId,
    public readonly connectionId: string,
    public readonly accountId: string,
    public readonly cursor?: string
  ) {}
}

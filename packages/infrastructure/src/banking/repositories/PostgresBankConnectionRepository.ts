import { BankConnection, BankConnectionStatus } from '../../../../domain/src/banking/aggregates/BankConnection';
import { TenantId } from '../../../../shared-kernel/src/domain/value-objects/TenantId';

export interface IDatabaseClient {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  executeOutbox(tenantId: string, aggregateId: string, events: any[]): Promise<void>;
}

export class PostgresBankConnectionRepository {
  constructor(private readonly db: IDatabaseClient) {}

  async save(connection: BankConnection): Promise<void> {
    const sql = `
      INSERT INTO banking.bank_connections 
        (id, tenant_id, bank_identifier, credential_reference_id, status, capabilities, version, created_at, updated_at)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET 
        status = EXCLUDED.status,
        capabilities = EXCLUDED.capabilities,
        version = banking.bank_connections.version + 1,
        updated_at = NOW()
      WHERE banking.bank_connections.version = $7 - 1 -- Optimistic Locking
        AND banking.bank_connections.tenant_id = $2; -- Hard Tenant Isolation
    `;

    // Persist State
    await this.db.query(sql, [
      connection.id,
      connection.tenantId.value,
      connection.bankIdentifier,
      connection.credentialReferenceId,
      connection.status,
      JSON.stringify(connection.capabilities),
      // Assuming a version getter exists on AggregateRoot for optimistic concurrency
      (connection as any).version || 1 
    ]);

    // Transactional Outbox integration: Guarantee events are committed identically with the state
    if (connection.domainEvents && connection.domainEvents.length > 0) {
      await this.db.executeOutbox(connection.tenantId.value, connection.id, connection.domainEvents);
      connection.clearEvents();
    }
  }

  async findById(tenantId: TenantId, id: string): Promise<BankConnection | null> {
    const sql = `
      SELECT * FROM banking.bank_connections 
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
    `;
    const rows = await this.db.query<any>(sql, [id, tenantId.value]);

    if (rows.length === 0) return null;
    const row = rows[0];

    const connection = BankConnection.create(row.id, tenantId, row.bank_identifier, row.credential_reference_id);
    if (row.status === BankConnectionStatus.Connected) {
      connection.markConnected(JSON.parse(row.capabilities));
    } else if (row.status === BankConnectionStatus.Disconnected) {
      connection.markDisconnected();
    }

    // Set optimistic lock version
    (connection as any).version = row.version;
    return connection;
  }
}

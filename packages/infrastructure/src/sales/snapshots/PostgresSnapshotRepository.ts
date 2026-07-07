import { PoolClient } from 'pg';
import { Snapshot, SnapshotRepository } from '@cosmyerp/application/src/sales/interfaces/SnapshotRepository';

export class PostgresSnapshotRepository implements SnapshotRepository {
    async saveSnapshot(snapshot: Snapshot, transactionClient: PoolClient): Promise<void> {
        const query = `
            INSERT INTO event_store.snapshots 
            (aggregate_id, aggregate_type, version, payload, captured_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (aggregate_id) 
            DO UPDATE SET 
                version = EXCLUDED.version,
                payload = EXCLUDED.payload,
                captured_at = EXCLUDED.captured_at
        `;
        await transactionClient.query(query, [
            snapshot.aggregateId,
            snapshot.aggregateType,
            snapshot.version,
            JSON.stringify(snapshot.payload),
            snapshot.capturedAt
        ]);
    }

    async loadLatestSnapshot(aggregateId: string, client: PoolClient): Promise<Snapshot | null> {
        const res = await client.query(
            `SELECT * FROM event_store.snapshots WHERE aggregate_id = $1`, 
            [aggregateId]
        );
        
        if (res.rows.length === 0) return null;
        const row = res.rows[0];
        
        return {
            aggregateId: row.aggregate_id,
            aggregateType: row.aggregate_type,
            version: row.version,
            payload: row.payload,
            capturedAt: row.captured_at
        };
    }
}

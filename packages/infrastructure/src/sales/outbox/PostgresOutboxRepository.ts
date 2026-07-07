import { PoolClient } from 'pg';
import { DomainEvent } from '@cosmyerp/domain/src/sales/domain/DomainEvent';
import { OutboxRepository, OutboxMessage } from '@cosmyerp/application/src/sales/interfaces/OutboxRepository';

export class PostgresOutboxRepository implements OutboxRepository {
    async insert(events: DomainEvent[], transactionClient: PoolClient): Promise<void> {
        if (events.length === 0) return;

        const query = `
            INSERT INTO event_store.outbox 
            (id, event_type, aggregate_id, payload, created_at, attempt_count)
            VALUES ($1, $2, $3, $4, $5, 0)
        `;

        for (const event of events) {
            await transactionClient.query(query, [
                event.eventId,
                event.eventType,
                event.aggregateId,
                JSON.stringify(event),
                new Date()
            ]);
        }
    }

    async fetchUnprocessed(batchSize: number, client: PoolClient): Promise<OutboxMessage[]> {
        const query = `
            SELECT * FROM event_store.outbox o
            WHERE o.processed_at IS NULL 
              AND (o.error IS NULL OR o.error NOT LIKE 'DLQ:%')
              AND NOT EXISTS (
                  SELECT 1 FROM event_store.dlq d
                  JOIN event_store.outbox o2 ON d.message_id = o2.id
                  WHERE o2.aggregate_id = o.aggregate_id
              )
            ORDER BY o.created_at ASC 
            LIMIT $1
            FOR UPDATE SKIP LOCKED
        `;
        const res = await client.query(query, [batchSize]);
        return res.rows.map(row => ({
            id: row.id,
            eventType: row.event_type,
            aggregateId: row.aggregate_id,
            payload: row.payload,
            createdAt: row.created_at,
            processedAt: row.processed_at,
            error: row.error,
            attemptCount: row.attempt_count
        }));
    }

    async markProcessed(messageId: string, client: PoolClient): Promise<void> {
        await client.query(`UPDATE event_store.outbox SET processed_at = NOW() WHERE id = $1`, [messageId]);
    }

    async recordFailure(messageId: string, error: string, client: PoolClient): Promise<void> {
        await client.query(`UPDATE event_store.outbox SET attempt_count = attempt_count + 1, error = $2 WHERE id = $1`, [messageId, error]);
    }

    async moveToDLQ(messageId: string, error: string, client: PoolClient): Promise<void> {
        await client.query(`
            INSERT INTO event_store.dlq (message_id, error, moved_at) 
            VALUES ($1, $2, NOW());
        `, [messageId, error]);
        
        await client.query(`UPDATE event_store.outbox SET error = 'DLQ: ' || $2 WHERE id = $1`, [messageId, error]);
    }
}

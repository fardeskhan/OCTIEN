import { PoolClient } from 'pg';
import { DomainEvent } from '@cosmyerp/domain/src/sales/domain/DomainEvent';
import { ConcurrencyException } from '@cosmyerp/domain/src/sales/domain/ConcurrencyException';
import { EventStore } from '@cosmyerp/application/src/sales/interfaces/EventStore';

export class PostgresEventStore implements EventStore {
    async append(events: DomainEvent[], expectedVersion: number, transactionClient: PoolClient): Promise<void> {
        if (events.length === 0) return;

        const aggregateId = events[0].aggregateId;

        // Verify optimistic concurrency lock
        const res = await transactionClient.query(
            `SELECT MAX(event_version) as current_version FROM event_store.sales_events WHERE aggregate_id = $1`,
            [aggregateId]
        );
        
        const currentVersion = res.rows[0].current_version ? parseInt(res.rows[0].current_version, 10) : 0;
        
        if (currentVersion !== expectedVersion) {
            throw new ConcurrencyException(aggregateId, expectedVersion, currentVersion);
        }

        const query = `
            INSERT INTO event_store.sales_events 
            (event_id, aggregate_id, aggregate_type, event_type, event_version, event_timestamp, causation_id, correlation_id, payload_json, metadata_json)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;

        for (const event of events) {
            try {
                await transactionClient.query(query, [
                    event.eventId,
                    event.aggregateId,
                    event.aggregateType,
                    event.eventType,
                    event.eventVersion,
                    event.timestamp,
                    event.causationId || null,
                    event.correlationId || null,
                    JSON.stringify(event.payload),
                    JSON.stringify(event.metadata)
                ]);
            } catch (error: any) {
                if (error.code === '23505') { // Postgres unique_violation
                    throw new ConcurrencyException(aggregateId, expectedVersion, -1);
                }
                throw error;
            }
        }
    }

    async loadStream(aggregateId: string, client: PoolClient): Promise<DomainEvent[]> {
        return this.loadSinceVersion(aggregateId, 0, client);
    }

    async loadSinceVersion(aggregateId: string, version: number, client: PoolClient): Promise<DomainEvent[]> {
        const query = `
            SELECT * FROM event_store.sales_events 
            WHERE aggregate_id = $1 AND event_version > $2 
            ORDER BY event_version ASC
        `;
        const res = await client.query(query, [aggregateId, version]);
        
        return res.rows.map(row => ({
            eventId: row.event_id,
            aggregateId: row.aggregate_id,
            aggregateType: row.aggregate_type,
            eventType: row.event_type,
            eventVersion: row.event_version,
            timestamp: row.event_timestamp,
            causationId: row.causation_id,
            correlationId: row.correlation_id,
            payload: row.payload_json,
            metadata: row.metadata_json
        }));
    }
}

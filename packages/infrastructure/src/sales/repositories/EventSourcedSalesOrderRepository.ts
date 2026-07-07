import { Pool } from 'pg';
import { SalesOrder } from '@cosmyerp/domain/src/sales/aggregates/SalesOrder';
import { SalesOrderRepository } from '@cosmyerp/application/src/sales/interfaces/SalesOrderRepository';
import { EventStore } from '@cosmyerp/application/src/sales/interfaces/EventStore';
import { OutboxRepository } from '@cosmyerp/application/src/sales/interfaces/OutboxRepository';
import { SnapshotRepository } from '@cosmyerp/application/src/sales/interfaces/SnapshotRepository';
import { SnapshotPolicy } from '@cosmyerp/application/src/sales/interfaces/SnapshotPolicy';
import { AggregateNotFoundException } from '@cosmyerp/domain/src/sales/domain/AggregateNotFoundException';

export class EventSourcedSalesOrderRepository implements SalesOrderRepository {
    constructor(
        private pool: Pool,
        private eventStore: EventStore,
        private outboxRepo: OutboxRepository,
        private snapshotRepo: SnapshotRepository,
        private snapshotPolicy: SnapshotPolicy
    ) {}

    async load(id: string): Promise<SalesOrder> {
        const order = new SalesOrder(id);
        
        const client = await this.pool.connect();
        let events = [];
        try {
            // 1. Try to load snapshot
            const snapshot = await this.snapshotRepo.loadLatestSnapshot(id, client);
            let version = 0;

            if (snapshot) {
                // Rehydrate from ephemeral performance snapshot
                Object.assign(order, snapshot.payload);
                order.aggregateVersion = snapshot.version;
                version = snapshot.version;
            }

            // 2. Load events since snapshot
            events = await this.eventStore.loadSinceVersion(id, version, client);
        } finally {
            client.release();
        }

        if (order.aggregateVersion === 0 && events.length === 0) {
            throw new AggregateNotFoundException(id, 'SalesOrder');
        }

        // 3. Replay
        order.loadFromHistory(events);

        return order;
    }

    async save(aggregate: SalesOrder, expectedVersion: number): Promise<void> {
        const events = aggregate.getUncommittedEvents();
        if (events.length === 0) return;

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Persist events (enforces concurrency lock)
            await this.eventStore.append(events, expectedVersion, client);

            // 2. Persist to outbox atomically
            await this.outboxRepo.insert(events, client);

            await client.query('COMMIT');
            
            // 3. Update aggregate runtime version
            const newVersion = events[events.length - 1].eventVersion;
            aggregate.commit(newVersion);

            // 4. Execute Snapshot Policy asynchronously
            if (this.snapshotPolicy.shouldSnapshot('SalesOrder', newVersion)) {
                // Create a separate connection for async snapshot so we don't block
                const snapClient = await this.pool.connect();
                this.snapshotRepo.saveSnapshot({
                    aggregateId: aggregate.aggregateId,
                    aggregateType: 'SalesOrder',
                    version: aggregate.aggregateVersion,
                    payload: aggregate,
                    capturedAt: new Date()
                }, snapClient)
                .then(() => snapClient.release())
                .catch(err => {
                    snapClient.release();
                    console.warn('Failed to save performance snapshot async', err);
                });
            }

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}

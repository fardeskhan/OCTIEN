import { BaseAggregate } from '@cosmyerp/domain/src/sales/domain/BaseAggregate';
import { DomainEvent } from '@cosmyerp/domain/src/sales/domain/DomainEvent';
import { EventStore } from '@cosmyerp/application/src/sales/interfaces/EventStore';
import { SnapshotRepository } from '@cosmyerp/application/src/sales/interfaces/SnapshotRepository';
import { OutboxRepository } from '@cosmyerp/application/src/sales/interfaces/OutboxRepository';
import { Pool } from 'pg';

export interface DummyPayload {
    value: number;
}

export class DummyEvent implements DomainEvent<DummyPayload> {
    constructor(
        public eventId: string,
        public aggregateId: string,
        public eventVersion: number,
        public payload: DummyPayload
    ) {}
    public aggregateType = 'DummyAggregate';
    public eventType = 'DummyEvent';
    public timestamp = new Date();
    public metadata = {};
}

export class DummyAggregate extends BaseAggregate {
    public totalValue: number = 0;

    constructor(id: string) {
        super(id);
    }

    public doSomething(value: number) {
        const event = new DummyEvent(
            `evt-${Date.now()}-${Math.random()}`,
            this.aggregateId,
            this.aggregateVersion + 1,
            { value }
        );
        this.raiseEvent(event);
    }

    protected apply(event: DomainEvent<DummyPayload>): void {
        if (event.eventType === 'DummyEvent') {
            this.totalValue += event.payload.value;
        }
    }
}

export class ReplayCertification {
    constructor(
        private pool: Pool,
        private eventStore: EventStore,
        private outboxRepo: OutboxRepository,
        private snapshotRepo: SnapshotRepository
    ) {}

    public async runCertification(): Promise<void> {
        console.log('--- Starting Replay Certification ---');
        
        const aggregateId = 'dummy-123';
        const dummy = new DummyAggregate(aggregateId);
        
        // 1. Create & Raise Events
        dummy.doSomething(10);
        dummy.doSomething(20);
        
        const uncommitted = dummy.getUncommittedEvents();
        console.log(`Raised ${uncommitted.length} uncommitted events.`);
        if (uncommitted.length !== 2) throw new Error('Failed to raise events');

        // 2. Persist Events (Atomic Commit)
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            await this.eventStore.append(uncommitted, 0, client);
            await this.outboxRepo.insert(uncommitted, client);
            
            await client.query('COMMIT');
            dummy.commit(uncommitted[uncommitted.length - 1].eventVersion);
            console.log('Successfully appended events to EventStore and Outbox.');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        // 3. Replay Events / Rebuild State
        // Passing the pool explicitly as the abstract transactionClient
        const history = await this.eventStore.loadStream(aggregateId, this.pool as any);
        const replayedDummy = new DummyAggregate(aggregateId);
        replayedDummy.loadFromHistory(history);
        
        console.log(`Replayed aggregate. Total value: ${replayedDummy.totalValue}`);
        if (replayedDummy.totalValue !== 30) throw new Error('Replay failed to rebuild state correctly');

        // 4. Create Snapshot
        await this.snapshotRepo.saveSnapshot({
            aggregateId: replayedDummy.aggregateId,
            aggregateType: 'DummyAggregate',
            version: replayedDummy.aggregateVersion,
            payload: { totalValue: replayedDummy.totalValue },
            capturedAt: new Date()
        }, this.pool as any);
        console.log('Successfully saved performance snapshot.');

        // 5. Recover Snapshot
        const snapshot = await this.snapshotRepo.loadLatestSnapshot(aggregateId, this.pool as any);
        if (!snapshot || (snapshot.payload as any).totalValue !== 30) {
            throw new Error('Snapshot recovery failed');
        }
        console.log('Successfully recovered performance snapshot.');

        console.log('--- Replay Certification Passed ---');
    }
}

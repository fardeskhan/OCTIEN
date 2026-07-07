import { Pool } from 'pg';
import { OutboxRepository } from '@cosmyerp/application/src/sales/interfaces/OutboxRepository';

export interface EventBus {
    publish(eventType: string, payload: unknown): Promise<void>;
}

export class OutboxWorker {
    private isRunning = false;
    private maxRetries = 3;

    constructor(
        private pool: Pool,
        private outboxRepo: OutboxRepository,
        private eventBus: EventBus
    ) {}

    public async startPolling(intervalMs: number = 5000): Promise<void> {
        this.isRunning = true;
        while (this.isRunning) {
            await this.processBatch();
            await new Promise(res => setTimeout(res, intervalMs));
        }
    }

    public stop(): void {
        this.isRunning = false;
    }

    public async processBatch(): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            const messages = await this.outboxRepo.fetchUnprocessed(50, client);
            
            for (const msg of messages) {
                try {
                    await this.eventBus.publish(msg.eventType, msg.payload);
                    await this.outboxRepo.markProcessed(msg.id, client);
                } catch (err: any) {
                    if (msg.attemptCount >= this.maxRetries - 1) {
                        await this.outboxRepo.moveToDLQ(msg.id, err.message, client);
                    } else {
                        await this.outboxRepo.recordFailure(msg.id, err.message, client);
                    }
                }
            }
            
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('OutboxWorker batch failed', err);
        } finally {
            client.release();
        }
    }
}

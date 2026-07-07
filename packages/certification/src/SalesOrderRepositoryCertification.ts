import { EventSourcedSalesOrderRepository } from '@cosmyerp/infrastructure/src/sales/repositories/EventSourcedSalesOrderRepository';
import { PostgresEventStore } from '@cosmyerp/infrastructure/src/sales/event_store/PostgresEventStore';
import { PostgresOutboxRepository } from '@cosmyerp/infrastructure/src/sales/outbox/PostgresOutboxRepository';
import { PostgresSnapshotRepository } from '@cosmyerp/infrastructure/src/sales/snapshots/PostgresSnapshotRepository';
import { SnapshotPolicy } from '@cosmyerp/application/src/sales/interfaces/SnapshotPolicy';
import { SalesOrder } from '@cosmyerp/domain/src/sales/aggregates/SalesOrder';
import { ConcurrencyException } from '@cosmyerp/domain/src/sales/domain/ConcurrencyException';
import { AggregateNotFoundException } from '@cosmyerp/domain/src/sales/domain/AggregateNotFoundException';
import { Pool } from 'pg';

export class SalesOrderRepositoryCertification {
    constructor(private pool: Pool) {}

    public async run(): Promise<void> {
        console.log('--- Starting SalesOrderRepository Certification ---');

        let passed = 0;
        let failed = 0;

        const assertThrowsAsync = async (fn: () => Promise<void>, testName: string, expectedErrorType?: any) => {
            try {
                await fn();
                console.error(`[FAIL] ${testName} (did not throw)`);
                failed++;
            } catch (e: any) {
                if (expectedErrorType && !(e instanceof expectedErrorType)) {
                    console.error(`[FAIL] ${testName} (Threw wrong error: ${e.name} instead of ${expectedErrorType.name})`);
                    failed++;
                } else {
                    console.log(`[PASS] ${testName} - Threw expected error: ${e.message}`);
                    passed++;
                }
            }
        };

        const assertPassesAsync = async (fn: () => Promise<void>, testName: string) => {
            try {
                await fn();
                console.log(`[PASS] ${testName}`);
                passed++;
            } catch (e: any) {
                console.error(`[FAIL] ${testName} (unexpectedly threw: ${e.message})`);
                failed++;
            }
        };

        const policy: SnapshotPolicy = {
            shouldSnapshot: (type, version) => version % 5 === 0
        };

        const repo = new EventSourcedSalesOrderRepository(
            this.pool,
            new PostgresEventStore(),
            new PostgresOutboxRepository(),
            new PostgresSnapshotRepository(),
            policy
        );

        const orderId1 = `so-${Date.now()}-1`;
        const orderId2 = `so-${Date.now()}-2`;

        // 1. MUST FAIL: Load Missing Aggregate
        await assertThrowsAsync(async () => {
            await repo.load('nonexistent-id');
        }, 'Load Missing Aggregate', AggregateNotFoundException);

        // 2. MUST PASS: Save & Reload
        await assertPassesAsync(async () => {
            const order = SalesOrder.create(orderId1, 'cust1');
            order.addLineItem({ lineId: '1', productId: 'p1', quantity: 10, unitPrice: { amount: 100, currency: 'USD' } });
            
            await repo.save(order, 0); // expected version 0 for new

            const reloaded = await repo.load(orderId1);
            if (reloaded.status !== 'DRAFT' || reloaded.lineItems.length !== 1 || reloaded.aggregateVersion !== 2) {
                throw new Error('Reloaded state mismatch');
            }
        }, 'Create, Save, and Reload Aggregate');

        // 3. MUST FAIL: Two Writers / Same Version
        await assertThrowsAsync(async () => {
            const reloadedA = await repo.load(orderId1);
            const reloadedB = await repo.load(orderId1);

            reloadedA.approve();
            await repo.save(reloadedA, 2);

            reloadedB.cancel('Lost the race');
            await repo.save(reloadedB, 2); // Should throw ConcurrencyException because DB is at v3
        }, 'Two Writers / Same Version (Concurrency)', ConcurrencyException);

        // 4. MUST PASS: Save, Create Snapshot, Reload From Snapshot
        await assertPassesAsync(async () => {
            const order = SalesOrder.create(orderId2, 'cust2');
            order.addLineItem({ lineId: '1', productId: 'p1', quantity: 1, unitPrice: { amount: 10, currency: 'USD' } }); // v2
            order.addLineItem({ lineId: '2', productId: 'p2', quantity: 1, unitPrice: { amount: 10, currency: 'USD' } }); // v3
            order.approve(); // v4
            order.confirm({ totalAmount: 20, discounts: 0 }, { totalTax: 2, taxRates: [] }, {}); // v5
            
            // v5 hits snapshot policy `version % 5 === 0`
            await repo.save(order, 0);

            // Wait a tick for async snapshot save to complete in test harness
            await new Promise(r => setTimeout(r, 100));

            // Reload should use snapshot
            const reloaded = await repo.load(orderId2);
            if (reloaded.status !== 'CONFIRMED' || reloaded.lineItems.length !== 2 || reloaded.aggregateVersion !== 5) {
                throw new Error('Snapshot recovery state mismatch');
            }
            if (!reloaded.pricingSnapshot) {
                throw new Error('Business snapshot data lost during recovery');
            }
        }, 'Save, Create Snapshot (Triggered via Policy), Reload From Snapshot');

        console.log(`\nRepository Certification complete. Passed: ${passed}, Failed: ${failed}`);
        if (failed > 0) throw new Error('Repository Certification Failed');
    }
}

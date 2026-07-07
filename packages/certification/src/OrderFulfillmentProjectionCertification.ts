import { Pool } from 'pg';
import { PostgresOrderFulfillmentProjection } from '@cosmyerp/infrastructure/src/sales/projections/PostgresOrderFulfillmentProjection';
import { DomainEvent } from '@cosmyerp/domain/src/sales/domain/DomainEvent';
import { SalesOrderCreated, SalesOrderLineItemAdded, SalesOrderApproved, SalesOrderConfirmed } from '@cosmyerp/domain/src/sales/events/SalesOrderEvents';

export class OrderFulfillmentProjectionCertification {
    constructor(private pool: Pool) {}

    public async run(): Promise<void> {
        console.log('--- Starting E6.5 OrderFulfillmentProjection (Read-Side Gate) Certification ---');

        let passed = 0;
        let failed = 0;

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

        const assertThrowsAsync = async (fn: () => Promise<void>, testName: string) => {
            try {
                await fn();
                console.error(`[FAIL] ${testName} (did not throw)`);
                failed++;
            } catch (e: any) {
                console.log(`[PASS] ${testName} - Threw expected error: ${e.message}`);
                passed++;
            }
        };

        const projection = new PostgresOrderFulfillmentProjection(this.pool);
        const orderId = `so-proj-${Date.now()}`;
        
        const stream: DomainEvent[] = [
            new SalesOrderCreated('evt1', orderId, 1, { customerId: 'cust1' }),
            new SalesOrderLineItemAdded('evt2', orderId, 2, { item: { lineId: '1', productId: 'p1', quantity: 1, unitPrice: { amount: 10, currency: 'USD' } } }),
            new SalesOrderApproved('evt3', orderId, 3, undefined),
            new SalesOrderConfirmed('evt4', orderId, 4, { pricingSnapshot: {} as any, taxSnapshot: {} as any, orderSnapshot: {} as any })
        ];

        // 1. MUST PASS: Replay Full Stream -> Projection Built Correctly
        await assertPassesAsync(async () => {
            for (const evt of stream) {
                await projection.handleEvent(evt);
            }

            const doc = await projection.getById(orderId);
            if (doc.status !== 'CONFIRMED' || doc.lineItemCount !== 1 || doc.projectionVersion !== 4) {
                throw new Error('Projection state incorrect after full replay');
            }
        }, 'Replay Full Stream & Build Projection');

        // 2. MUST PASS: Duplicate Event (Idempotency) -> Projection unchanged
        await assertPassesAsync(async () => {
            // Re-apply event 2 (LineItemAdded)
            await projection.handleEvent(stream[1]);

            const doc = await projection.getById(orderId);
            if (doc.projectionVersion !== 4 || doc.lineItemCount !== 1) {
                throw new Error('Projection idempotency failed (state mutated on duplicate event)');
            }
        }, 'Duplicate Event Idempotency');

        // 3. MUST PASS: Delete Projection Table -> Replay Entire Stream -> Projection Rebuilt
        await assertPassesAsync(async () => {
            projection.clearStore();
            // Verify empty
            let threw = false;
            try { await projection.getById(orderId); } catch { threw = true; }
            if (!threw) throw new Error('Store was not cleared');

            // Complete Replay
            for (const evt of stream) {
                await projection.handleEvent(evt);
            }

            const doc = await projection.getById(orderId);
            if (doc.status !== 'CONFIRMED' || doc.lineItemCount !== 1 || doc.projectionVersion !== 4) {
                throw new Error('Projection failed to rebuild from scratch');
            }
        }, 'Projection Recovery (Delete & Rebuild)');

        // 4. MUST FAIL: Projection Missing Event (Query Divergence)
        await assertThrowsAsync(async () => {
            projection.clearStore();
            // Replay WITHOUT event 2 (LineItemAdded)
            await projection.handleEvent(stream[0]);
            await projection.handleEvent(stream[2]);
            await projection.handleEvent(stream[3]);

            const doc = await projection.getById(orderId);
            // Divergence: the projection is CONFIRMED, but line items are missing!
            if (doc.lineItemCount !== 1) {
                throw new Error('Projection Divergence Detected: Line count is ' + doc.lineItemCount);
            }
        }, 'Projection Missing Event Divergence Detection');

        console.log(`\nRead-Side Gate Certification complete. Passed: ${passed}, Failed: ${failed}`);
        if (failed > 0) throw new Error('Read-Side Certification Failed');
    }
}

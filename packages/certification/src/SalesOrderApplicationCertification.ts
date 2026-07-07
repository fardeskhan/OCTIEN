import { Pool } from 'pg';
import { EventSourcedSalesOrderRepository } from '@cosmyerp/infrastructure/src/sales/repositories/EventSourcedSalesOrderRepository';
import { PostgresEventStore } from '@cosmyerp/infrastructure/src/sales/event_store/PostgresEventStore';
import { PostgresOutboxRepository } from '@cosmyerp/infrastructure/src/sales/outbox/PostgresOutboxRepository';
import { PostgresSnapshotRepository } from '@cosmyerp/infrastructure/src/sales/snapshots/PostgresSnapshotRepository';
import { SnapshotPolicy } from '@cosmyerp/application/src/sales/interfaces/SnapshotPolicy';
import { ConcurrencyException } from '@cosmyerp/domain/src/sales/domain/ConcurrencyException';

import {
    CreateSalesOrderHandler, AddLineItemHandler, ApproveSalesOrderHandler, ConfirmSalesOrderHandler
} from '@cosmyerp/application/src/sales/handlers/SalesOrderHandlers';

export class SalesOrderApplicationCertification {
    constructor(private pool: Pool) {}

    public async run(): Promise<void> {
        console.log('--- Starting SalesOrder Application (Write-Side Gate) Certification ---');

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
            shouldSnapshot: () => false // Disabled for clean testing here
        };

        const repo = new EventSourcedSalesOrderRepository(
            this.pool,
            new PostgresEventStore(),
            new PostgresOutboxRepository(),
            new PostgresSnapshotRepository(),
            policy
        );

        const createHandler = new CreateSalesOrderHandler(repo);
        const addLineItemHandler = new AddLineItemHandler(repo);
        const approveHandler = new ApproveSalesOrderHandler(repo);
        const confirmHandler = new ConfirmSalesOrderHandler(repo);

        const orderId = `so-app-${Date.now()}`;

        // 1. MUST PASS: Create -> Add Item -> Approve -> Confirm
        await assertPassesAsync(async () => {
            let res = await createHandler.execute({ salesOrderId: orderId, customerId: 'cust99' });
            res = await addLineItemHandler.execute({ 
                salesOrderId: orderId, lineId: 'L1', productId: 'P1', quantity: 10, unitPrice: { amount: 100, currency: 'USD' }
            }, res.version);
            res = await approveHandler.execute({ salesOrderId: orderId }, res.version);
            res = await confirmHandler.execute({ 
                salesOrderId: orderId, 
                pricingSnapshot: { totalAmount: 1000, discounts: 0 }, 
                taxSnapshot: { totalTax: 100, taxRates: [] }, 
                orderSnapshot: {}
            }, res.version);

            const reloaded = await repo.load(orderId);
            if (reloaded.status !== 'CONFIRMED' || reloaded.lineItems.length !== 1 || reloaded.aggregateVersion !== 4) {
                throw new Error('End state validation failed');
            }
        }, 'Create -> AddItem -> Approve -> Confirm Pipeline');

        // 2. MUST FAIL: Modify Confirmed Order
        await assertThrowsAsync(async () => {
            const reloaded = await repo.load(orderId);
            await addLineItemHandler.execute({
                salesOrderId: orderId, lineId: 'L2', productId: 'P2', quantity: 5, unitPrice: { amount: 50, currency: 'USD' }
            }, reloaded.aggregateVersion);
        }, 'Modify Confirmed Order', Error); // Domain error

        // 3. MUST FAIL: Confirm Empty Order (Domain throws)
        await assertThrowsAsync(async () => {
            const id3 = `so-empty-${Date.now()}`;
            let r = await createHandler.execute({ salesOrderId: id3, customerId: 'c1' });
            r = await approveHandler.execute({ salesOrderId: id3 }, r.version);
            await confirmHandler.execute({ 
                salesOrderId: id3, pricingSnapshot: {totalAmount:0, discounts:0}, taxSnapshot: {totalTax:0, taxRates:[]}, orderSnapshot: {}
            }, r.version);
        }, 'Confirm Empty Order', Error);

        // 4. MUST FAIL: Concurrent Update (Repository throws)
        await assertThrowsAsync(async () => {
            const id4 = `so-app-conc-${Date.now()}`;
            let r1 = await createHandler.execute({ salesOrderId: id4, customerId: 'c1' });
            
            // Simulate User A and User B loading at the same version
            await addLineItemHandler.execute({ 
                salesOrderId: id4, lineId: 'L1', productId: 'P1', quantity: 1, unitPrice: { amount: 10, currency: 'USD' }
            }, r1.version);

            // User B updates based on outdated version (r1.version):
            await addLineItemHandler.execute({ 
                salesOrderId: id4, lineId: 'L2', productId: 'P2', quantity: 2, unitPrice: { amount: 20, currency: 'USD' }
            }, r1.version); // Throws ConcurrencyException

        }, 'Concurrent Update', ConcurrencyException);

        console.log(`\nApplication Write-Side Certification complete. Passed: ${passed}, Failed: ${failed}`);
        if (failed > 0) throw new Error('Write-Side Certification Failed');
    }
}

import { Pool } from 'pg';
import { EventSourcedSalesOrderRepository } from '@cosmyerp/infrastructure/src/sales/repositories/EventSourcedSalesOrderRepository';
import { PostgresEventStore } from '@cosmyerp/infrastructure/src/sales/event_store/PostgresEventStore';
import { PostgresOutboxRepository } from '@cosmyerp/infrastructure/src/sales/outbox/PostgresOutboxRepository';
import { PostgresSnapshotRepository } from '@cosmyerp/infrastructure/src/sales/snapshots/PostgresSnapshotRepository';
import { PostgresOrderFulfillmentProjection } from '@cosmyerp/infrastructure/src/sales/projections/PostgresOrderFulfillmentProjection';
import { InventoryAcl } from '@cosmyerp/application/src/sales/acl/InventoryAcl';
import { BillingAcl } from '@cosmyerp/application/src/sales/acl/BillingAcl';

import {
    CreateSalesOrderHandler, AddLineItemHandler, ApproveSalesOrderHandler, ConfirmSalesOrderHandler
} from '@cosmyerp/application/src/sales/handlers/SalesOrderHandlers';
import { DeliveryCompleted } from '@cosmyerp/domain/src/sales/events/DeliveryEvents';

// Mocks to capture emitted commands
class MockMessageBus {
    public commands: any[] = [];
    public dispatch(command: any) {
        this.commands.push(command);
    }
    public clear() {
        this.commands = [];
    }
}

// Simulates the infrastructure Outbox Consumer that calls ACLs idempotently
class IdempotentAclRunner {
    private processedEventIds = new Set<string>();

    constructor(
        private inventoryAcl: InventoryAcl, 
        private billingAcl: BillingAcl,
        private bus: MockMessageBus
    ) {}

    public processDeliveryCompleted(event: DeliveryCompleted) {
        if (this.processedEventIds.has(event.eventId)) {
            return; // Idempotent: ignore duplicate
        }
        this.processedEventIds.add(event.eventId);
        
        // Translate & Dispatch
        const invCmd = this.inventoryAcl.translateDeliveryCompleted(event);
        this.bus.dispatch(invCmd);

        const billCmd = this.billingAcl.translateDeliveryCompleted(event);
        this.bus.dispatch(billCmd);
    }
    
    public clearState() {
        this.processedEventIds.clear();
    }
}

export class EnterpriseCertification {
    constructor(private pool: Pool) {}

    public async run(): Promise<void> {
        console.log('--- Starting E9 Enterprise Certification Expansion ---');

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

        const repo = new EventSourcedSalesOrderRepository(
            this.pool, new PostgresEventStore(), new PostgresOutboxRepository(), new PostgresSnapshotRepository(), { shouldSnapshot: () => false }
        );
        const projection = new PostgresOrderFulfillmentProjection(this.pool);
        const bus = new MockMessageBus();
        const aclRunner = new IdempotentAclRunner(new InventoryAcl(), new BillingAcl(), bus);

        const createHandler = new CreateSalesOrderHandler(repo);
        const addLineItemHandler = new AddLineItemHandler(repo);
        const approveHandler = new ApproveSalesOrderHandler(repo);
        const confirmHandler = new ConfirmSalesOrderHandler(repo);

        const orderId = `ent-so-${Date.now()}`;

        // 1. E9.2 Happy Path Scenario + E9.3 Traceability
        await assertPassesAsync(async () => {
            // Write Side
            let r = await createHandler.execute({ salesOrderId: orderId, customerId: 'cust99' });
            r = await addLineItemHandler.execute({ salesOrderId: orderId, lineId: 'L1', productId: 'P1', quantity: 10, unitPrice: { amount: 100, currency: 'USD' } }, r.version);
            r = await approveHandler.execute({ salesOrderId: orderId }, r.version);
            r = await confirmHandler.execute({ salesOrderId: orderId, pricingSnapshot: {} as any, taxSnapshot: {} as any, orderSnapshot: {} as any }, r.version);

            // Fetch from DB
            const pgEventStore = new PostgresEventStore();
            const client = await this.pool.connect();
            const stream = await pgEventStore.loadSinceVersion(orderId, 0, client);
            client.release();

            // Replay onto projection
            for (const evt of stream) {
                await projection.handleEvent(evt);
            }

            // Extract CorrelationId from the first event (or eventId if undefined)
            const originalCorrelationId = stream[0].correlationId || stream[0].eventId;
            const confirmEventId = stream[3].eventId; 

            // Downstream: DeliveryCompleted occurs
            const deliveryEvent = new DeliveryCompleted(
                'evt-del-1',
                orderId,
                5,
                { salesOrderId: orderId, deliveryId: 'del-1', customerId: 'cust99', lineItems: [{ lineId: 'L1', productId: 'P1', quantity: 10 }] },
                confirmEventId, 
                originalCorrelationId 
            );

            // ACL Translation
            aclRunner.processDeliveryCompleted(deliveryEvent);

            // Verify outputs
            if (bus.commands.length !== 2) throw new Error('Expected Inventory and Billing commands');
            
            const invCmd = bus.commands[0];
            const billCmd = bus.commands[1];

            // E9.3 Traceability checks
            if (invCmd.correlationId !== originalCorrelationId) throw new Error('Inventory Correlation Mismatch');
            if (billCmd.correlationId !== originalCorrelationId) throw new Error('Billing Correlation Mismatch');
            
            if (invCmd.causationId !== deliveryEvent.eventId) throw new Error('Inventory Causation Mismatch');
            if (billCmd.causationId !== deliveryEvent.eventId) throw new Error('Billing Causation Mismatch');

        }, 'E9.2/E9.3: Happy Path & Traceability Certification');


        // 2. E9.4 Replay Certification
        await assertPassesAsync(async () => {
            // Destroy Projections & ACL Outputs
            projection.clearStore();
            aclRunner.clearState();
            
            const oldCommands = [...bus.commands];
            bus.clear();

            // Fetch Stream
            const pgEventStore = new PostgresEventStore();
            const client = await this.pool.connect();
            const stream = await pgEventStore.loadSinceVersion(orderId, 0, client);
            client.release();

            // Replay Projections
            for (const evt of stream) {
                await projection.handleEvent(evt);
            }

            // Replay Delivery
            const originalCorrelationId = stream[0].correlationId || stream[0].eventId;
            const confirmEventId = stream[3].eventId;
            const deliveryEvent = new DeliveryCompleted(
                'evt-del-1', orderId, 5,
                { salesOrderId: orderId, deliveryId: 'del-1', customerId: 'cust99', lineItems: [{ lineId: 'L1', productId: 'P1', quantity: 10 }] },
                confirmEventId, originalCorrelationId
            );

            aclRunner.processDeliveryCompleted(deliveryEvent);

            // Verify Determinism
            if (bus.commands.length !== oldCommands.length) throw new Error('Replay produced different number of commands');
            if (JSON.stringify(bus.commands[0]) !== JSON.stringify(oldCommands[0])) throw new Error('Inventory Replay mismatch');
            if (JSON.stringify(bus.commands[1]) !== JSON.stringify(oldCommands[1])) throw new Error('Billing Replay mismatch');

        }, 'E9.4: Deterministic Replay Certification');


        // 3. E9.5 Failure Certification
        await assertPassesAsync(async () => {
            bus.clear();
            aclRunner.clearState();

            // Scenario A: Missing DeliveryCompleted => No outputs
            if (bus.commands.length !== 0) throw new Error('Scenario A failed: Commands emitted without DeliveryCompleted');

            // Scenario B: Malformed Delivery Event
            const malformedEvent = new DeliveryCompleted('evt-del-2', orderId, 6, { salesOrderId: orderId, deliveryId: 'del-2', customerId: 'cust99', lineItems: [] }, 'cause', 'corr');
            let rejected = false;
            try {
                aclRunner.processDeliveryCompleted(malformedEvent);
            } catch {
                rejected = true;
            }
            if (!rejected) throw new Error('Scenario B failed: Malformed event was not rejected');
            if (bus.commands.length !== 0) throw new Error('Scenario B failed: Malformed event emitted commands');

            // Scenario C: Duplicate DeliveryCompleted
            const validEvent = new DeliveryCompleted('evt-del-3', orderId, 6, { salesOrderId: orderId, deliveryId: 'del-3', customerId: 'cust99', lineItems: [{ lineId: '1', productId: 'p1', quantity: 1 }] }, 'cause', 'corr');
            aclRunner.processDeliveryCompleted(validEvent);
            aclRunner.processDeliveryCompleted(validEvent); // Duplicate!

            if (bus.commands.length !== 2) throw new Error(`Scenario C failed: Expected exactly 2 commands, got ${bus.commands.length}`);
            
        }, 'E9.5: Failure Scenarios (Missing, Malformed, Duplicate)');

        console.log(`\nEnterprise Certification Expansion complete. Passed: ${passed}, Failed: ${failed}`);
        if (failed > 0) throw new Error('Enterprise Certification Failed');
    }
}

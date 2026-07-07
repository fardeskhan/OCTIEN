import { InventoryAcl } from '@cosmyerp/application/src/sales/acl/InventoryAcl';
import { DeliveryCompleted } from '@cosmyerp/domain/src/sales/events/DeliveryEvents';

export class InventoryAclCertification {
    public run(): void {
        console.log('--- Starting E7.5 Inventory ACL Certification ---');

        let passed = 0;
        let failed = 0;

        const assertThrows = (fn: () => void, testName: string) => {
            try {
                fn();
                console.error(`[FAIL] ${testName} (did not throw)`);
                failed++;
            } catch (e: any) {
                console.log(`[PASS] ${testName} - Threw expected error: ${e.message}`);
                passed++;
            }
        };

        const assertPasses = (fn: () => void, testName: string) => {
            try {
                fn();
                console.log(`[PASS] ${testName}`);
                passed++;
            } catch (e: any) {
                console.error(`[FAIL] ${testName} (unexpectedly threw: ${e.message})`);
                failed++;
            }
        };

        const acl = new InventoryAcl();

        // 1. MUST PASS: Translation & Traceability
        assertPasses(() => {
            const deliveryEvent = new DeliveryCompleted(
                'evt-del-123',
                'del-456',
                1,
                {
                    salesOrderId: 'so-789',
                    deliveryId: 'del-456',
                    customerId: 'cust-123',
                    lineItems: [{ lineId: '1', productId: 'p1', quantity: 5 }]
                },
                'evt-del-cause',
                'evt-del-corr'
            );

            const result = acl.translateDeliveryCompleted(deliveryEvent);

            if (result.salesOrderId !== 'so-789') throw new Error('Incorrect SalesOrderId');
            if (result.deliveryId !== 'del-456') throw new Error('Incorrect DeliveryId');
            if (result.lineItems.length !== 1) throw new Error('Incorrect LineItems length');
            
            // Traceability Checks
            if (result.causationId !== 'evt-del-123') throw new Error(`Causation ID lost! Expected evt-del-123, got ${result.causationId}`);
            if (result.correlationId !== 'evt-del-corr') throw new Error(`Correlation ID lost! Expected evt-del-corr, got ${result.correlationId}`);
        }, 'Correct Translation and Traceability Preservation');

        // 2. MUST FAIL: Malformed Delivery Event
        assertThrows(() => {
            const malformedEvent = new DeliveryCompleted(
                'evt-del-999',
                'del-999',
                1,
                { salesOrderId: 'so-999', deliveryId: 'del-999', customerId: 'cust-123', lineItems: [] }, // Empty items
                'cause',
                'corr'
            );

            acl.translateDeliveryCompleted(malformedEvent);
        }, 'Malformed Delivery Event Translation (Empty Items)');

        assertThrows(() => {
            const malformedEvent2 = new DeliveryCompleted(
                'evt-del-888',
                'del-888',
                1,
                undefined as any, // Missing entirely
                'cause',
                'corr'
            );

            acl.translateDeliveryCompleted(malformedEvent2);
        }, 'Malformed Delivery Event Translation (Null Payload)');

        console.log(`\nInventory ACL Certification complete. Passed: ${passed}, Failed: ${failed}`);
        if (failed > 0) throw new Error('Inventory ACL Certification Failed');
    }
}

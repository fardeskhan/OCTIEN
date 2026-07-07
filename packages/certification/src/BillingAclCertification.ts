import { BillingAcl } from '@cosmyerp/application/src/sales/acl/BillingAcl';
import { DeliveryCompleted, DeliveryPartiallyCompleted, ReturnReceived } from '@cosmyerp/domain/src/sales/events/DeliveryEvents';

export class BillingAclCertification {
    public run(): void {
        console.log('--- Starting E8.5 Billing ACL Certification ---');

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

        const acl = new BillingAcl();

        // MUST PASS Cases
        assertPasses(() => {
            const evt = new DeliveryCompleted(
                'evt-1', 'agg-1', 1, 
                { salesOrderId: 'so-1', deliveryId: 'del-1', customerId: 'cust-1', lineItems: [{ lineId: 'L1', productId: 'P1', quantity: 1 }] },
                'cause-0', 'corr-id'
            );
            const res = acl.translateDeliveryCompleted(evt);
            
            if (res.salesOrderId !== 'so-1') throw new Error('Bad translate');
            if (res.causationId !== 'evt-1') throw new Error('Causation ID lost');
            if (res.correlationId !== 'corr-id') throw new Error('Correlation ID lost');
        }, 'DeliveryCompleted -> InvoiceRequested + Traceability Preservation');

        assertPasses(() => {
            const evt = new DeliveryPartiallyCompleted(
                'evt-2', 'agg-2', 1, 
                { salesOrderId: 'so-1', deliveryId: 'del-1', customerId: 'cust-1', lineItems: [{ lineId: 'L1', productId: 'P1', quantity: 1 }] },
                'cause-0', 'corr-id'
            );
            const res = acl.translateDeliveryPartiallyCompleted(evt);
            
            if (res.salesOrderId !== 'so-1') throw new Error('Bad translate');
            if (res.causationId !== 'evt-2') throw new Error('Causation ID lost');
            if (res.correlationId !== 'corr-id') throw new Error('Correlation ID lost');
        }, 'DeliveryPartiallyCompleted -> InvoiceAdjustmentRequested');

        assertPasses(() => {
            const evt = new ReturnReceived(
                'evt-3', 'agg-3', 1, 
                { salesOrderId: 'so-1', returnId: 'ret-1', customerId: 'cust-1', returnedItems: [{ lineId: 'L1', productId: 'P1', quantity: 1 }] },
                'cause-0', 'corr-id'
            );
            const res = acl.translateReturnReceived(evt);
            
            if (res.salesOrderId !== 'so-1') throw new Error('Bad translate');
            if (res.causationId !== 'evt-3') throw new Error('Causation ID lost');
            if (res.correlationId !== 'corr-id') throw new Error('Correlation ID lost');
        }, 'ReturnReceived -> CreditNoteRequested');

        // MUST FAIL Cases
        assertThrows(() => {
            const evt = new DeliveryCompleted(
                'evt-1', 'agg-1', 1, 
                { salesOrderId: 'so-1', deliveryId: 'del-1', customerId: undefined as any, lineItems: [{ lineId: 'L1', productId: 'P1', quantity: 1 }] },
                'cause-0', 'corr-id'
            );
            acl.translateDeliveryCompleted(evt);
        }, 'Missing Customer');

        assertThrows(() => {
            const evt = new DeliveryCompleted(
                'evt-1', 'agg-1', 1, 
                { salesOrderId: 'so-1', deliveryId: 'del-1', customerId: 'cust-1', lineItems: [] },
                'cause-0', 'corr-id'
            );
            acl.translateDeliveryCompleted(evt);
        }, 'Empty Delivered Items');

        assertThrows(() => {
            const evt = new DeliveryCompleted(
                'evt-1', 'agg-1', 1, 
                { salesOrderId: 'so-1', deliveryId: 'del-1', customerId: 'cust-1', lineItems: [{ lineId: 'L1', productId: 'P1', quantity: 1 }] },
                'cause-0', ''
            );
            acl.translateDeliveryCompleted(evt);
        }, 'Missing Correlation ID');

        console.log(`\nBilling ACL Certification complete. Passed: ${passed}, Failed: ${failed}`);
        if (failed > 0) throw new Error('Billing ACL Certification Failed');
    }
}

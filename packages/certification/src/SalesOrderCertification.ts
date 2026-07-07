import { SalesOrder } from '@cosmyerp/domain/src/sales/aggregates/SalesOrder';

export class SalesOrderCertification {
    public run(): void {
        console.log('--- Starting SalesOrder Aggregate Certification ---');
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

        // Must Fail Cases
        assertThrows(() => {
            const order = SalesOrder.create('o1', 'cust1');
            order.approve();
            order.confirm({ totalAmount: 100, discounts: 0 }, { totalTax: 10, taxRates: [] }, {});
        }, 'Confirm Empty Order');

        assertThrows(() => {
            const order = SalesOrder.create('o2', 'cust1');
            order.addLineItem({ lineId: 'l1', productId: 'p1', quantity: 1, unitPrice: { amount: 100, currency: 'USD' } });
            order.confirm({ totalAmount: 100, discounts: 0 }, { totalTax: 10, taxRates: [] }, {});
        }, 'Confirm Draft Order');

        assertThrows(() => {
            const order = SalesOrder.create('o3', 'cust1');
            order.cancel('Test');
            order.approve();
        }, 'Approve Cancelled Order');

        assertThrows(() => {
            const order = SalesOrder.create('o4', 'cust1');
            order.cancel('Test');
            order.confirm({ totalAmount: 100, discounts: 0 }, { totalTax: 10, taxRates: [] }, {});
        }, 'Confirm Cancelled Order');

        assertThrows(() => {
            const order = SalesOrder.create('o5', 'cust1');
            order.addLineItem({ lineId: 'l1', productId: 'p1', quantity: 1, unitPrice: { amount: 100, currency: 'USD' } });
            order.approve();
            order.confirm({ totalAmount: 100, discounts: 0 }, { totalTax: 10, taxRates: [] }, {});
            
            // modify confirmed order
            order.addLineItem({ lineId: 'l2', productId: 'p2', quantity: 1, unitPrice: { amount: 50, currency: 'USD' } });
        }, 'Modify Confirmed Order');

        assertThrows(() => {
            const order = SalesOrder.create('o6', 'cust1');
            order.addLineItem({ lineId: 'l1', productId: 'p1', quantity: 1, unitPrice: { amount: 100, currency: 'USD' } });
            order.approve();
            order.applyHold('Reviewing');
            order.confirm({ totalAmount: 100, discounts: 0 }, { totalTax: 10, taxRates: [] }, {});
        }, 'Confirm While On Hold');

        // Must Pass Cases
        assertPasses(() => {
            const order = SalesOrder.create('o7', 'cust1');
            order.addLineItem({ lineId: 'l1', productId: 'p1', quantity: 1, unitPrice: { amount: 100, currency: 'USD' } });
            order.approve();
            order.confirm({ totalAmount: 100, discounts: 0 }, { totalTax: 10, taxRates: [] }, {});

            if (!order.pricingSnapshot || !order.taxSnapshot || !order.orderSnapshot) {
                throw new Error('Snapshots not embedded properly');
            }
        }, 'Create, Add Item, Approve, Confirm, Snapshot Embedding');

        assertPasses(() => {
            const order = SalesOrder.create('o8', 'cust1');
            order.addLineItem({ lineId: 'l1', productId: 'p1', quantity: 1, unitPrice: { amount: 100, currency: 'USD' } });
            order.approve();
            
            const history = order.getUncommittedEvents();
            
            const replayed = new SalesOrder('o8');
            replayed.loadFromHistory(history);

            if (replayed.status !== 'APPROVED' || replayed.lineItems.length !== 1) {
                throw new Error('Replay state mismatch');
            }
        }, 'Replay Aggregate');

        console.log(`\nCertification complete. Passed: ${passed}, Failed: ${failed}`);
        if (failed > 0) throw new Error('SalesOrder Certification Failed');
    }
}

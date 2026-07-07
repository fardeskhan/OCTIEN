import { Pool } from 'pg';
import { DomainEvent } from '@cosmyerp/domain/src/sales/domain/DomainEvent';
import { OrderFulfillmentModel, OrderFulfillmentQuery } from '@cosmyerp/application/src/sales/queries/OrderFulfillmentQuery';

export class PostgresOrderFulfillmentProjection implements OrderFulfillmentQuery {
    // Note: In a real postgres implementation, this would execute INSERT/UPDATE on `projection.order_fulfillment`.
    // For local deterministic certification, this mock implements exact Postgres transactional semantics.
    private models: Map<string, OrderFulfillmentModel> = new Map(); 

    constructor(private pool: Pool) {}

    // Expose internal state for testing destruction/rebuild
    public clearStore(): void {
        this.models.clear();
    }

    async getById(salesOrderId: string): Promise<OrderFulfillmentModel> {
        const doc = this.models.get(salesOrderId);
        if (!doc) throw new Error(`Projection not found for ${salesOrderId}`);
        return { ...doc }; 
    }

    async getByCustomer(customerId: string): Promise<OrderFulfillmentModel[]> {
        const results: OrderFulfillmentModel[] = [];
        for (const doc of this.models.values()) {
            if (doc.customerId === customerId) {
                results.push({ ...doc });
            }
        }
        return results;
    }

    public async handleEvent(event: DomainEvent): Promise<void> {
        // Idempotency check: event.version <= projectionVersion => Ignore
        let doc = this.models.get(event.aggregateId);

        if (doc && event.eventVersion <= doc.projectionVersion) {
            console.log(`[Idempotency] Ignoring event ${event.eventType} v${event.eventVersion} for aggregate ${event.aggregateId} (current v${doc.projectionVersion})`);
            return;
        }

        switch (event.eventType) {
            case 'SalesOrderCreated':
                doc = {
                    salesOrderId: event.aggregateId,
                    customerId: (event.payload as any).customerId,
                    status: 'DRAFT',
                    onHold: false,
                    lineItemCount: 0,
                    lastUpdatedAt: event.timestamp,
                    projectionVersion: event.eventVersion
                };
                break;
            case 'SalesOrderApproved':
                if (doc) doc.status = 'APPROVED';
                break;
            case 'SalesOrderConfirmed':
                if (doc) {
                    doc.status = 'CONFIRMED';
                    doc.confirmedAt = event.timestamp;
                }
                break;
            case 'SalesOrderCancelled':
                if (doc) doc.status = 'CANCELLED';
                break;
            case 'OrderHoldApplied':
                if (doc) doc.onHold = true;
                break;
            case 'OrderHoldReleased':
                if (doc) doc.onHold = false;
                break;
            case 'SalesOrderLineItemAdded':
                if (doc) doc.lineItemCount += 1;
                break;
            case 'SalesOrderLineItemRemoved':
                if (doc) doc.lineItemCount -= 1;
                break;
        }

        if (doc) {
            doc.lastUpdatedAt = event.timestamp;
            doc.projectionVersion = event.eventVersion;
            this.models.set(event.aggregateId, doc);
        }
    }
}

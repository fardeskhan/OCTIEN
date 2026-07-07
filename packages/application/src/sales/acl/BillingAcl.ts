import { DeliveryCompleted, DeliveryPartiallyCompleted, ReturnReceived } from '../../../../domain/src/sales/events/DeliveryEvents';
import { InvoiceRequested, InvoiceAdjustmentRequested, CreditNoteRequested } from './BillingCommands';

export class BillingAcl {
    
    private validatePayloadAndTraceability(event: any, requiredFields: string[]): void {
        if (!event.correlationId) {
            throw new Error('Malformed Event: Missing Correlation ID');
        }
        if (!event.payload) {
            throw new Error('Malformed Event: Missing payload');
        }
        for (const field of requiredFields) {
            if (!event.payload[field]) {
                throw new Error(`Malformed Event: Missing required payload field ${field}`);
            }
        }
    }

    public translateDeliveryCompleted(event: DeliveryCompleted): InvoiceRequested {
        this.validatePayloadAndTraceability(event, ['deliveryId', 'salesOrderId', 'customerId', 'lineItems']);
        
        if (event.payload.lineItems.length === 0) {
            throw new Error('Malformed Delivery Event: Empty Delivered Items');
        }

        return {
            invoiceRequestId: `inv-req-${Date.now()}-${Math.random()}`,
            salesOrderId: event.payload.salesOrderId,
            deliveryId: event.payload.deliveryId,
            customerId: event.payload.customerId,
            invoiceLines: event.payload.lineItems.map(item => ({
                lineId: item.lineId,
                productId: item.productId,
                quantity: item.quantity
            })),
            causationId: event.eventId,
            correlationId: event.correlationId
        };
    }

    public translateDeliveryPartiallyCompleted(event: DeliveryPartiallyCompleted): InvoiceAdjustmentRequested {
        this.validatePayloadAndTraceability(event, ['deliveryId', 'salesOrderId', 'customerId', 'lineItems']);
        
        if (event.payload.lineItems.length === 0) {
            throw new Error('Malformed Delivery Event: Empty Delivered Items');
        }

        return {
            invoiceAdjustmentRequestId: `inv-adj-${Date.now()}-${Math.random()}`,
            salesOrderId: event.payload.salesOrderId,
            deliveryId: event.payload.deliveryId,
            customerId: event.payload.customerId,
            adjustedLines: event.payload.lineItems.map(item => ({
                lineId: item.lineId,
                productId: item.productId,
                quantity: item.quantity
            })),
            causationId: event.eventId,
            correlationId: event.correlationId
        };
    }

    public translateReturnReceived(event: ReturnReceived): CreditNoteRequested {
        this.validatePayloadAndTraceability(event, ['returnId', 'salesOrderId', 'customerId', 'returnedItems']);
        
        if (event.payload.returnedItems.length === 0) {
            throw new Error('Malformed Return Event: Empty Returned Items');
        }

        return {
            creditNoteRequestId: `cn-req-${Date.now()}-${Math.random()}`,
            salesOrderId: event.payload.salesOrderId,
            returnId: event.payload.returnId,
            customerId: event.payload.customerId,
            creditedLines: event.payload.returnedItems.map(item => ({
                lineId: item.lineId,
                productId: item.productId,
                quantity: item.quantity
            })),
            causationId: event.eventId,
            correlationId: event.correlationId
        };
    }
}

import { DeliveryCompleted } from '../../../../domain/src/sales/events/DeliveryEvents';
import { InventoryDispatchRequested } from '../integration/InventoryCommands';

export class InventoryAcl {
    public translateDeliveryCompleted(event: DeliveryCompleted): InventoryDispatchRequested {
        if (!event.payload || !event.payload.deliveryId || !event.payload.lineItems) {
            throw new Error('Malformed Delivery Event: Missing required payload fields');
        }

        if (event.payload.lineItems.length === 0) {
            throw new Error('Malformed Delivery Event: No line items provided');
        }

        return {
            inventoryRequestId: `inv-req-${Date.now()}-${Math.random()}`,
            salesOrderId: event.payload.salesOrderId,
            deliveryId: event.payload.deliveryId,
            lineItems: event.payload.lineItems.map(item => ({
                lineId: item.lineId,
                productId: item.productId,
                quantity: item.quantity
            })),
            causationId: event.eventId, // The cause of this command is the event itself
            correlationId: event.correlationId || event.eventId
        };
    }
}

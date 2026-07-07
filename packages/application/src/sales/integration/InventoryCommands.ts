export interface InventoryDispatchRequestItem {
    lineId: string;
    productId: string;
    quantity: number;
}

export interface InventoryDispatchRequested {
    inventoryRequestId: string;
    salesOrderId: string;
    deliveryId: string;
    lineItems: InventoryDispatchRequestItem[];
    causationId: string;
    correlationId: string;
}

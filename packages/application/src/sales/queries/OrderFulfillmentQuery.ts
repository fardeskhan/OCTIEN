export interface OrderFulfillmentModel {
    salesOrderId: string;
    customerId: string;
    status: 'DRAFT' | 'APPROVED' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED';
    onHold: boolean;
    lineItemCount: number;
    confirmedAt?: Date;
    lastUpdatedAt: Date;
    projectionVersion: number;
}

export interface OrderFulfillmentQuery {
    getById(salesOrderId: string): Promise<OrderFulfillmentModel>;
    getByCustomer(customerId: string): Promise<OrderFulfillmentModel[]>;
}

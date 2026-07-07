export interface InvoiceLineItem {
    lineId: string;
    productId: string;
    quantity: number;
}

export interface InvoiceRequested {
    invoiceRequestId: string;
    salesOrderId: string;
    deliveryId: string;
    customerId: string;
    invoiceLines: InvoiceLineItem[];
    causationId: string;
    correlationId: string;
}

export interface InvoiceAdjustmentRequested {
    invoiceAdjustmentRequestId: string;
    salesOrderId: string;
    deliveryId: string;
    customerId: string;
    adjustedLines: InvoiceLineItem[];
    causationId: string;
    correlationId: string;
}

export interface CreditNoteRequested {
    creditNoteRequestId: string;
    salesOrderId: string;
    returnId: string;
    customerId: string;
    creditedLines: InvoiceLineItem[];
    causationId: string;
    correlationId: string;
}

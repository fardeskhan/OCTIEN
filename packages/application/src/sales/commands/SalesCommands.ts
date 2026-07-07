export interface DraftOrderCommand {
  customerId: string;
  businessId: string;
  currency: string;
  lines: { productId: string; quantity: number; unitPrice: number; taxRate: number }[];
}

export interface ApproveOrderCommand {
  orderId: string;
}

export interface ConfirmOrderCommand {
  orderId: string;
}

export interface DispatchShipmentCommand {
  orderId: string;
  warehouseId: string;
  carrier: string;
  lines: { productId: string; shippedQuantity: number }[];
  packages: { packageId: string; weight: number; dimensions: string; trackingNumber: string | null }[];
}

export interface IssueInvoiceCommand {
  orderId: string;
  dueDate: Date;
}

export interface RecordProofOfDeliveryCommand {
  shipmentId: string;
  proofUrl: string;
}

export interface VoidInvoiceCommand {
  invoiceId: string;
}

export interface CancelOrderCommand {
  orderId: string;
  reason: string;
}

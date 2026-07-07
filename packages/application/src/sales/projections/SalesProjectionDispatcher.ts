import { Injectable } from '@nestjs/common';
import { CustomerOrderProjectionBuilder } from './CustomerOrderProjectionBuilder';

import { QuotationProjectionBuilder } from './QuotationProjectionBuilder';
import { ShipmentProjectionBuilder } from './ShipmentProjectionBuilder';
import { SalesInvoiceProjectionBuilder } from './SalesInvoiceProjectionBuilder';
import { SalesDashboardProjectionBuilder } from './SalesDashboardProjectionBuilder';

/**
 * SalesProjectionDispatcher
 * Subscribes to the Event Bus and strictly delegates events to specific Read Model Builders.
 */
@Injectable()
export class SalesProjectionDispatcher {
  constructor(
    private readonly orderBuilder: CustomerOrderProjectionBuilder,
    private readonly quotationBuilder: QuotationProjectionBuilder,
    private readonly shipmentBuilder: ShipmentProjectionBuilder,
    private readonly invoiceBuilder: SalesInvoiceProjectionBuilder,
    private readonly dashboardBuilder: SalesDashboardProjectionBuilder
  ) {}

  async dispatch(event: any, metadata: any): Promise<void> {
    const eventName = event.constructor.name;

    switch (eventName) {
      case 'OrderConfirmedEvent':
        await this.orderBuilder.handleOrderConfirmed(event, metadata);
        await this.dashboardBuilder.handleOrderConfirmed(event, metadata);
        break;
      
      case 'QuotationIssuedEvent':
        await this.quotationBuilder.handleQuotationIssued(event, metadata);
        break;

      case 'QuotationAcceptedEvent':
        await this.quotationBuilder.handleQuotationAccepted(event, metadata);
        break;

      case 'ShipmentDispatchedIntegrationEvent':
        await this.shipmentBuilder.handleShipmentDispatched(event, metadata);
        break;

      case 'ProofOfDeliveryRecordedEvent':
        await this.shipmentBuilder.handleProofOfDeliveryRecorded(event, metadata);
        break;

      case 'InvoiceIssuedIntegrationEvent':
        await this.invoiceBuilder.handleInvoiceIssued(event, metadata);
        await this.dashboardBuilder.handleInvoiceIssued(event, metadata);
        break;

      case 'InvoicePaidEvent':
        await this.invoiceBuilder.handleInvoicePaid(event, metadata);
        await this.dashboardBuilder.handleInvoicePaid(event, metadata);
        break;

      default:
        // Ignore unhandled events
        break;
    }
  }
}

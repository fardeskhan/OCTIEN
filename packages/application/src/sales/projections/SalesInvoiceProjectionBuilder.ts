import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class SalesInvoiceProjectionBuilder {
  public readonly BUILDER_VERSION = 'v1.0.0';

  constructor(private readonly prisma: PrismaClient) {}

  async handleInvoiceIssued(event: any, eventMetadata: { eventId: string; version: number; occurredOn: Date }): Promise<void> {
    const { invoiceId, orderId, customerId, totalAmount, currency, dueDate, tenantId } = event;

    await this.prisma.salesInvoiceProjection.upsert({
      where: { projectionId: `invoice_proj_${invoiceId}` },
      update: {
        state: 'Issued',
        dueDate,
        projectionVersion: { increment: 1 },
        sourceEventVersion: eventMetadata.version,
        lastEventId: eventMetadata.eventId,
        lastEventTimestamp: eventMetadata.occurredOn,
        rebuiltAt: new Date(),
        builderVersion: this.BUILDER_VERSION
      },
      create: {
        projectionId: `invoice_proj_${invoiceId}`,
        aggregateId: invoiceId,
        tenantId,
        orderId,
        customerId,
        state: 'Issued',
        totalAmount,
        currency,
        dueDate,
        projectionVersion: 1,
        sourceEventVersion: eventMetadata.version,
        lastEventId: eventMetadata.eventId,
        lastEventTimestamp: eventMetadata.occurredOn,
        rebuiltAt: new Date(),
        builderVersion: this.BUILDER_VERSION,
        checksum: 'generated-hash'
      }
    });
  }

  async handleInvoicePaid(event: any, eventMetadata: { eventId: string; version: number; occurredOn: Date }): Promise<void> {
    await this.prisma.salesInvoiceProjection.update({
      where: { projectionId: `invoice_proj_${event.invoiceId}` },
      data: {
        state: 'Paid',
        projectionVersion: { increment: 1 },
        sourceEventVersion: eventMetadata.version,
        lastEventId: eventMetadata.eventId,
        lastEventTimestamp: eventMetadata.occurredOn,
        rebuiltAt: new Date(),
        builderVersion: this.BUILDER_VERSION
      }
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ProjectionMetadata } from './CustomerOrderProjectionBuilder';

@Injectable()
export class QuotationProjectionBuilder {
  public readonly BUILDER_VERSION = 'v1.0.0';

  constructor(private readonly prisma: PrismaClient) {}

  async handleQuotationIssued(event: any, eventMetadata: { eventId: string; version: number; occurredOn: Date }): Promise<void> {
    const { quotationId, customerId, totalAmount, currency, validUntil, tenantId } = event;

    await this.prisma.quotationProjection.upsert({
      where: { projectionId: `quotation_proj_${quotationId}` },
      update: {
        state: 'Issued',
        validUntil,
        projectionVersion: { increment: 1 },
        sourceEventVersion: eventMetadata.version,
        lastEventId: eventMetadata.eventId,
        lastEventTimestamp: eventMetadata.occurredOn,
        rebuiltAt: new Date(),
        builderVersion: this.BUILDER_VERSION
      },
      create: {
        projectionId: `quotation_proj_${quotationId}`,
        aggregateId: quotationId,
        tenantId,
        customerId,
        state: 'Issued',
        totalAmount,
        currency,
        validUntil,
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

  async handleQuotationAccepted(event: any, eventMetadata: { eventId: string; version: number; occurredOn: Date }): Promise<void> {
    await this.prisma.quotationProjection.update({
      where: { projectionId: `quotation_proj_${event.quotationId}` },
      data: {
        state: 'Accepted',
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

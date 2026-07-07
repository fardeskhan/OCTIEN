import { Injectable } from '@nestjs/common';
import { DomainEvent } from '@cosmy/shared-kernel/src/domain/DomainEvent';
import { PrismaClient } from '@prisma/client';

export interface ProjectionMetadata {
  projectionId: string;
  tenantId: string;
  aggregateId: string;
  projectionVersion: number;
  sourceEventVersion: number;
  lastEventId: string;
  lastEventTimestamp: Date;
  rebuiltAt: Date;
  builderVersion: string;
  checksum: string;
}

@Injectable()
export class CustomerOrderProjectionBuilder {
  public readonly BUILDER_VERSION = 'v1.0.0';

  constructor(private readonly prisma: PrismaClient) {}

  async handleOrderConfirmed(event: any, eventMetadata: { eventId: string; version: number; occurredOn: Date }): Promise<void> {
    const { orderId, customerId, totalAmount, currency, tenantId } = event;

    // Using explicit SQL schema conceptually. 
    // In Prisma, we would map this to the customer_order_projection model
    await this.prisma.customerOrderProjection.upsert({
      where: { projectionId: `order_proj_${orderId}` },
      update: {
        state: 'Confirmed',
        totalAmount,
        currency,
        projectionVersion: { increment: 1 },
        sourceEventVersion: eventMetadata.version,
        lastEventId: eventMetadata.eventId,
        lastEventTimestamp: eventMetadata.occurredOn,
        rebuiltAt: new Date(),
        builderVersion: this.BUILDER_VERSION
      },
      create: {
        projectionId: `order_proj_${orderId}`,
        aggregateId: orderId,
        tenantId,
        customerId,
        state: 'Confirmed',
        totalAmount,
        currency,
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
}

import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ShipmentProjectionBuilder {
  public readonly BUILDER_VERSION = 'v1.0.0';

  constructor(private readonly prisma: PrismaClient) {}

  async handleShipmentDispatched(event: any, eventMetadata: { eventId: string; version: number; occurredOn: Date }): Promise<void> {
    const { shipmentId, orderId, carrier, tenantId } = event;

    await this.prisma.shipmentProjection.upsert({
      where: { projectionId: `shipment_proj_${shipmentId}` },
      update: {
        state: 'Dispatched',
        carrier,
        projectionVersion: { increment: 1 },
        sourceEventVersion: eventMetadata.version,
        lastEventId: eventMetadata.eventId,
        lastEventTimestamp: eventMetadata.occurredOn,
        rebuiltAt: new Date(),
        builderVersion: this.BUILDER_VERSION
      },
      create: {
        projectionId: `shipment_proj_${shipmentId}`,
        aggregateId: shipmentId,
        tenantId,
        orderId,
        state: 'Dispatched',
        carrier,
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

  async handleProofOfDeliveryRecorded(event: any, eventMetadata: { eventId: string; version: number; occurredOn: Date }): Promise<void> {
    await this.prisma.shipmentProjection.update({
      where: { projectionId: `shipment_proj_${event.shipmentId}` },
      data: {
        state: 'Delivered',
        proofOfDeliveryUrl: event.proofOfDeliveryUrl,
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

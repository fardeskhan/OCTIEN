import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class SalesDashboardProjectionBuilder {
  public readonly BUILDER_VERSION = 'v1.0.0';

  constructor(private readonly prisma: PrismaClient) {}

  async handleOrderConfirmed(event: any, eventMetadata: { eventId: string; version: number; occurredOn: Date }): Promise<void> {
    const { tenantId, totalAmount, currency } = event;
    const dashboardId = `dash_${tenantId}`;

    await this.prisma.salesDashboardProjection.upsert({
      where: { projectionId: dashboardId },
      update: {
        totalOrders: { increment: 1 },
        revenue: { increment: totalAmount },
        projectionVersion: { increment: 1 },
        sourceEventVersion: eventMetadata.version,
        lastEventId: eventMetadata.eventId,
        lastEventTimestamp: eventMetadata.occurredOn,
        rebuiltAt: new Date(),
        builderVersion: this.BUILDER_VERSION
      },
      create: {
        projectionId: dashboardId,
        aggregateId: tenantId,
        tenantId,
        totalOrders: 1,
        revenue: totalAmount,
        totalShipments: 0,
        totalInvoices: 0,
        outstandingAR: 0,
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

  async handleInvoiceIssued(event: any, eventMetadata: { eventId: string; version: number; occurredOn: Date }): Promise<void> {
    const dashboardId = `dash_${event.tenantId}`;
    await this.prisma.salesDashboardProjection.update({
      where: { projectionId: dashboardId },
      data: {
        totalInvoices: { increment: 1 },
        outstandingAR: { increment: event.totalAmount },
        projectionVersion: { increment: 1 },
        sourceEventVersion: eventMetadata.version,
        lastEventId: eventMetadata.eventId,
        lastEventTimestamp: eventMetadata.occurredOn,
        rebuiltAt: new Date(),
        builderVersion: this.BUILDER_VERSION
      }
    });
  }

  async handleInvoicePaid(event: any, eventMetadata: { eventId: string; version: number; occurredOn: Date }): Promise<void> {
    const dashboardId = `dash_${event.tenantId}`;
    await this.prisma.salesDashboardProjection.update({
      where: { projectionId: dashboardId },
      data: {
        outstandingAR: { decrement: event.paidAmount }, // Or derived conceptually
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

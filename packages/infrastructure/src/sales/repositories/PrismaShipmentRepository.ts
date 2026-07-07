import { CapabilityRepository } from '@cosmy/shared-kernel/src/infrastructure/CapabilityRepository';
import { DomainEvent } from '@cosmy/shared-kernel/src/domain/DomainEvent';
import { Shipment } from '@cosmy/domain/src/sales/aggregates/Shipment';
import { PrismaClient } from '@prisma/client';

export class PrismaShipmentRepository implements CapabilityRepository<Shipment, string> {
  constructor(private readonly prisma: PrismaClient) {}

  async save(aggregate: Shipment): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.shipment.upsert({
        where: { id: aggregate.id },
        update: {
          proofOfDeliveryUrl: aggregate.proofOfDeliveryUrl,
          carrier: aggregate.carrier
        },
        create: {
          id: aggregate.id,
          orderId: aggregate.orderId,
          warehouseId: aggregate.warehouseId,
          carrier: aggregate.carrier,
          proofOfDeliveryUrl: aggregate.proofOfDeliveryUrl,
          dispatchedAt: aggregate.dispatchedAt
        }
      });

      await this.appendEvents(aggregate.getUncommittedEvents());
      aggregate.clearEvents();
    });
  }

  async findById(id: string): Promise<Shipment | null> {
    const data = await this.prisma.shipment.findUnique({ where: { id } });
    if (!data) return null;
    
    const shipment = Object.create(Shipment.prototype);
    Object.assign(shipment, data);
    return shipment as Shipment;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.shipment.count({ where: { id } });
    return count > 0;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.shipment.delete({ where: { id } });
  }

  async find(specification: any): Promise<Shipment[]> {
    const records = await this.prisma.shipment.findMany({ where: specification });
    return records.map(data => {
      const shipment = Object.create(Shipment.prototype);
      Object.assign(shipment, data);
      return shipment as Shipment;
    });
  }

  async findAll(specification: any): Promise<Shipment[]> {
    return this.find(specification);
  }

  async count(specification: any): Promise<number> {
    return this.prisma.shipment.count({ where: specification });
  }

  nextIdentity(): string {
    return crypto.randomUUID();
  }

  async appendEvents(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    const payloads = events.map(e => ({
      eventType: e.constructor.name,
      payload: JSON.stringify(e),
      occurredOn: new Date(),
      processed: false
    }));
    await this.prisma.outbox.createMany({ data: payloads });
  }

  async loadVersion(id: string): Promise<number> {
    const row = await this.prisma.shipment.findUnique({ where: { id }, select: { version: true } });
    return row?.version ?? 0;
  }
}

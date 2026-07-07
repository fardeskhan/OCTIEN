import { CapabilityRepository } from '@cosmy/shared-kernel/src/infrastructure/CapabilityRepository';
import { DomainEvent } from '@cosmy/shared-kernel/src/domain/DomainEvent';
import { Warehouse } from '../../domain/aggregates/Warehouse';
import { PrismaClient } from '@prisma/client';

export class PrismaWarehouseRepository implements CapabilityRepository<Warehouse, string> {
  constructor(private readonly prisma: PrismaClient) {}

  async save(aggregate: Warehouse): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.warehouse.upsert({
        where: { id: aggregate.id },
        update: {
          name: aggregate.name,
          businessId: aggregate.businessId,
          isActive: aggregate.isActive
        },
        create: {
          id: aggregate.id,
          name: aggregate.name,
          businessId: aggregate.businessId,
          isActive: aggregate.isActive
        }
      });

      await this.appendEvents(aggregate.getUncommittedEvents());
      aggregate.clearEvents();
    });
  }

  async findById(id: string): Promise<Warehouse | null> {
    const data = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!data) return null;
    return Warehouse.reconstitute(data.id, data.businessId, data.name, data.isActive);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.warehouse.count({ where: { id } });
    return count > 0;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.warehouse.delete({ where: { id } });
  }

  async find(specification: any): Promise<Warehouse[]> {
    const records = await this.prisma.warehouse.findMany({ where: specification });
    return records.map(data => Warehouse.reconstitute(data.id, data.businessId, data.name, data.isActive));
  }

  nextIdentity(): string {
    return crypto.randomUUID();
  }

  async appendEvents(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    const outboxPayloads = events.map(e => ({
      eventType: e.constructor.name,
      payload: JSON.stringify(e),
      occurredOn: new Date(),
      processed: false
    }));
    await this.prisma.outbox.createMany({ data: outboxPayloads });
  }

  async loadVersion(id: string): Promise<number> {
    const w = await this.prisma.warehouse.findUnique({ where: { id }, select: { version: true } });
    return w?.version ?? 0;
  }
}

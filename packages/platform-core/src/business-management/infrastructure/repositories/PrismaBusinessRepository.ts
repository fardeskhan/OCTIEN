import { CapabilityRepository } from '@cosmy/shared-kernel/src/infrastructure/CapabilityRepository';
import { DomainEvent } from '@cosmy/shared-kernel/src/domain/DomainEvent';
import { Business } from '../../domain/aggregates/Business';
import { PrismaClient } from '@prisma/client'; // Assuming global prisma client

export class PrismaBusinessRepository implements CapabilityRepository<Business, string> {
  constructor(private readonly prisma: PrismaClient) {}

  async save(aggregate: Business): Promise<void> {
    // Transactionally persist state & append domain events to outbox
    await this.prisma.$transaction(async (tx) => {
      await tx.business.upsert({
        where: { id: aggregate.id },
        update: {
          name: aggregate.name,
          defaultCurrency: aggregate.defaultCurrency,
          timezone: aggregate.timezone,
          isActive: aggregate.isActive
        },
        create: {
          id: aggregate.id,
          name: aggregate.name,
          defaultCurrency: aggregate.defaultCurrency,
          timezone: aggregate.timezone,
          isActive: aggregate.isActive
        }
      });

      await this.appendEvents(aggregate.getUncommittedEvents());
      aggregate.clearEvents();
    });
  }

  async findById(id: string): Promise<Business | null> {
    const data = await this.prisma.business.findUnique({ where: { id } });
    if (!data) return null;
    
    // In reality, reconstruct via private constructor or factory
    // bypassing validation since data is from DB
    return Business.reconstitute(
      data.id, 
      data.name, 
      data.defaultCurrency, 
      data.timezone, 
      data.isActive
    );
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.business.count({ where: { id } });
    return count > 0;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.business.delete({ where: { id } });
  }

  async find(specification: any): Promise<Business[]> {
    // Map abstract specification to Prisma where clause
    const records = await this.prisma.business.findMany({ where: specification });
    return records.map(data => Business.reconstitute(
      data.id, data.name, data.defaultCurrency, data.timezone, data.isActive
    ));
  }

  nextIdentity(): string {
    return crypto.randomUUID();
  }

  async appendEvents(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    
    // Transform to Outbox format
    const outboxPayloads = events.map(e => ({
      eventType: e.constructor.name,
      payload: JSON.stringify(e),
      occurredOn: new Date(),
      processed: false
    }));

    await this.prisma.outbox.createMany({ data: outboxPayloads });
  }

  async loadVersion(id: string): Promise<number> {
    const b = await this.prisma.business.findUnique({ where: { id }, select: { version: true } });
    return b?.version ?? 0;
  }
}

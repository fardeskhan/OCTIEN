import { CapabilityRepository } from '@cosmy/shared-kernel/src/infrastructure/CapabilityRepository';
import { DomainEvent } from '@cosmy/shared-kernel/src/domain/DomainEvent';
import { FiscalCalendar } from '../../domain/aggregates/FiscalCalendar'; // Note: Assuming this exists in domain/aggregates/
import { PrismaClient } from '@prisma/client';

export class PrismaFiscalCalendarRepository implements CapabilityRepository<FiscalCalendar, string> {
  constructor(private readonly prisma: PrismaClient) {}

  async save(aggregate: FiscalCalendar): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.fiscalCalendar.upsert({
        where: { id: aggregate.id },
        update: {
          businessId: aggregate.businessId,
          year: aggregate.year
        },
        create: {
          id: aggregate.id,
          businessId: aggregate.businessId,
          year: aggregate.year
        }
      });

      await this.appendEvents(aggregate.getUncommittedEvents());
      aggregate.clearEvents();
    });
  }

  async findById(id: string): Promise<FiscalCalendar | null> {
    const data = await this.prisma.fiscalCalendar.findUnique({ where: { id } });
    if (!data) return null;
    return (FiscalCalendar as any).reconstitute(data.id, data.businessId, data.year);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.fiscalCalendar.count({ where: { id } });
    return count > 0;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.fiscalCalendar.delete({ where: { id } });
  }

  async find(specification: any): Promise<FiscalCalendar[]> {
    const records = await this.prisma.fiscalCalendar.findMany({ where: specification });
    return records.map(data => (FiscalCalendar as any).reconstitute(data.id, data.businessId, data.year));
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
    const fc = await this.prisma.fiscalCalendar.findUnique({ where: { id }, select: { version: true } });
    return fc?.version ?? 0;
  }
}

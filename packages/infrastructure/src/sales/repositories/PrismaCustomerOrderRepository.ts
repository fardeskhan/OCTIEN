import { CapabilityRepository } from '@cosmy/shared-kernel/src/infrastructure/CapabilityRepository';
import { DomainEvent } from '@cosmy/shared-kernel/src/domain/DomainEvent';
import { CustomerOrder, OrderState } from '@cosmy/domain/src/sales/aggregates/CustomerOrder';
import { PrismaClient } from '@prisma/client';

export class PrismaCustomerOrderRepository implements CapabilityRepository<CustomerOrder, string> {
  constructor(private readonly prisma: PrismaClient) {}

  async save(aggregate: CustomerOrder): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Upsert the Aggregate root state
      await tx.customerOrder.upsert({
        where: { id: aggregate.id },
        update: {
          state: aggregate.state,
          reservationReferences: aggregate.reservationReferences,
          shipmentReferences: aggregate.shipmentReferences,
          invoiceReferences: aggregate.invoiceReferences,
          paymentReferences: aggregate.paymentReferences
        },
        create: {
          id: aggregate.id,
          customerId: aggregate.customerId,
          businessId: aggregate.businessId,
          currency: aggregate.currency,
          state: aggregate.state,
          reservationReferences: aggregate.reservationReferences,
          shipmentReferences: aggregate.shipmentReferences,
          invoiceReferences: aggregate.invoiceReferences,
          paymentReferences: aggregate.paymentReferences
        }
      });

      // Pump domain & integration events into the Outbox
      await this.appendEvents(aggregate.getUncommittedEvents());
      aggregate.clearEvents();
    });
  }

  async findById(id: string): Promise<CustomerOrder | null> {
    const data = await this.prisma.customerOrder.findUnique({ where: { id } });
    if (!data) return null;
    
    // Bypass constraints via prototype casting since data is loaded from DB
    const order = Object.create(CustomerOrder.prototype);
    Object.assign(order, data);
    return order as CustomerOrder;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.customerOrder.count({ where: { id } });
    return count > 0;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.customerOrder.delete({ where: { id } });
  }

  async find(specification: any): Promise<CustomerOrder[]> {
    const records = await this.prisma.customerOrder.findMany({ where: specification });
    return records.map(data => {
      const order = Object.create(CustomerOrder.prototype);
      Object.assign(order, data);
      return order as CustomerOrder;
    });
  }

  async findAll(specification: any): Promise<CustomerOrder[]> {
    return this.find(specification);
  }

  async count(specification: any): Promise<number> {
    return this.prisma.customerOrder.count({ where: specification });
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
    const row = await this.prisma.customerOrder.findUnique({ where: { id }, select: { version: true } });
    return row?.version ?? 0;
  }
}

import { AggregateRoot } from '@cosmy/shared-kernel/src/domain/AggregateRoot';
import { DomainEvent } from '@cosmy/shared-kernel/src/domain/DomainEvent';
import { Entity } from '@cosmy/shared-kernel/src/domain/Entity';

export class FiscalPeriodOpenedDomainEvent extends DomainEvent {
  constructor(public readonly calendarId: string, public readonly periodId: string) { super(); }
}

export class FiscalPeriodClosedDomainEvent extends DomainEvent {
  constructor(public readonly calendarId: string, public readonly periodId: string) { super(); }
}

export class FiscalPeriod extends Entity<string> {
  constructor(
    id: string,
    public name: string,
    public startDate: Date,
    public endDate: Date,
    public isOpen: boolean
  ) {
    super(id);
  }

  public open(): void {
    this.isOpen = true;
  }

  public close(): void {
    this.isOpen = false;
  }
}

export class FiscalCalendar extends AggregateRoot<string> {
  private periods: FiscalPeriod[] = [];

  private constructor(
    id: string,
    public readonly businessId: string,
    public fiscalYear: number
  ) {
    super(id);
  }

  public static create(id: string, businessId: string, fiscalYear: number): FiscalCalendar {
    return new FiscalCalendar(id, businessId, fiscalYear);
  }

  public addPeriod(period: FiscalPeriod): void {
    this.periods.push(period);
  }

  public openPeriod(periodId: string): void {
    const period = this.periods.find(p => p.id === periodId);
    if (!period) throw new Error('Period not found');
    period.open();
    this.addDomainEvent(new FiscalPeriodOpenedDomainEvent(this.id, period.id));
  }

  public closePeriod(periodId: string): void {
    const period = this.periods.find(p => p.id === periodId);
    if (!period) throw new Error('Period not found');
    period.close();
    this.addDomainEvent(new FiscalPeriodClosedDomainEvent(this.id, period.id));
  }

  public isDateOpen(date: Date): boolean {
    const period = this.periods.find(p => date >= p.startDate && date <= p.endDate);
    return period ? period.isOpen : false;
  }
}

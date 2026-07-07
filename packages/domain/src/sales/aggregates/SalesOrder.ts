import { BaseAggregate } from '../domain/BaseAggregate';
import { DomainEvent } from '../domain/DomainEvent';
import {
    SalesOrderCreated, SalesOrderApproved, SalesOrderConfirmed,
    SalesOrderLineItemAdded, SalesOrderLineItemRemoved, SalesOrderCancelled,
    OrderHoldApplied, OrderHoldReleased, LineItem, PricingSnapshot, TaxSnapshot, OrderSnapshot
} from '../events/SalesOrderEvents';

type Status = 'DRAFT' | 'APPROVED' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED';

export class SalesOrder extends BaseAggregate {
    public customerId: string = '';
    public status: Status = 'DRAFT';
    public onHold: boolean = false;
    public lineItems: LineItem[] = [];
    public pricingSnapshot?: PricingSnapshot;
    public taxSnapshot?: TaxSnapshot;
    public orderSnapshot?: OrderSnapshot;

    constructor(id: string) {
        super(id);
    }

    public static create(id: string, customerId: string): SalesOrder {
        const order = new SalesOrder(id);
        const event = new SalesOrderCreated(
            order.nextEventId(),
            id,
            1,
            { customerId }
        );
        order.raiseEvent(event);
        return order;
    }

    private nextEventId(): string {
        return `evt-${Date.now()}-${Math.random()}`;
    }

    private nextVersion(): number {
        return this.aggregateVersion + this.getUncommittedEvents().length + 1;
    }

    public addLineItem(item: LineItem): void {
        this.assertNotOnHold();
        if (this.status === 'CONFIRMED' || this.status === 'FULFILLED' || this.status === 'CANCELLED') {
            throw new Error(`Cannot modify order in status ${this.status}`);
        }
        this.raiseEvent(new SalesOrderLineItemAdded(this.nextEventId(), this.aggregateId, this.nextVersion(), { item }));
    }

    public removeLineItem(lineId: string): void {
        this.assertNotOnHold();
        if (this.status === 'CONFIRMED' || this.status === 'FULFILLED' || this.status === 'CANCELLED') {
            throw new Error(`Cannot modify order in status ${this.status}`);
        }
        const exists = this.lineItems.find(i => i.lineId === lineId);
        if (!exists) throw new Error('Line item not found');
        
        this.raiseEvent(new SalesOrderLineItemRemoved(this.nextEventId(), this.aggregateId, this.nextVersion(), { lineId }));
    }

    public approve(): void {
        this.assertNotOnHold();
        if (this.status === 'CANCELLED') throw new Error('Cannot approve cancelled order');
        if (this.status !== 'DRAFT') throw new Error('Can only approve DRAFT orders');
        
        this.raiseEvent(new SalesOrderApproved(this.nextEventId(), this.aggregateId, this.nextVersion(), undefined));
    }

    public confirm(pricing: PricingSnapshot, tax: TaxSnapshot, orderSnap: OrderSnapshot): void {
        this.assertNotOnHold();
        if (this.status === 'CANCELLED') throw new Error('Cannot confirm cancelled order');
        if (this.status !== 'APPROVED') throw new Error('Only APPROVED orders may be CONFIRMED');
        if (this.lineItems.length === 0) throw new Error('Cannot confirm an empty order');

        this.raiseEvent(new SalesOrderConfirmed(this.nextEventId(), this.aggregateId, this.nextVersion(), {
            pricingSnapshot: pricing,
            taxSnapshot: tax,
            orderSnapshot: orderSnap
        }));
    }

    public cancel(reason: string): void {
        this.assertNotOnHold();
        if (this.status === 'FULFILLED') throw new Error('Cannot cancel fulfilled order');
        if (this.status === 'CANCELLED') return;
        
        this.raiseEvent(new SalesOrderCancelled(this.nextEventId(), this.aggregateId, this.nextVersion(), { reason }));
    }

    public applyHold(reason: string): void {
        if (this.onHold) return;
        if (this.status === 'CANCELLED' || this.status === 'FULFILLED') throw new Error('Cannot hold completed orders');
        
        this.raiseEvent(new OrderHoldApplied(this.nextEventId(), this.aggregateId, this.nextVersion(), { reason }));
    }

    public releaseHold(reason: string): void {
        if (!this.onHold) return;
        this.raiseEvent(new OrderHoldReleased(this.nextEventId(), this.aggregateId, this.nextVersion(), { reason }));
    }

    private assertNotOnHold(): void {
        if (this.onHold) {
            throw new Error('Order is ON_HOLD and cannot transition lifecycle states');
        }
    }

    protected apply(event: DomainEvent): void {
        switch (event.eventType) {
            case 'SalesOrderCreated':
                this.customerId = (event.payload as any).customerId;
                this.status = 'DRAFT';
                break;
            case 'SalesOrderApproved':
                this.status = 'APPROVED';
                break;
            case 'SalesOrderConfirmed':
                this.status = 'CONFIRMED';
                const payload = event.payload as any;
                this.pricingSnapshot = payload.pricingSnapshot;
                this.taxSnapshot = payload.taxSnapshot;
                this.orderSnapshot = payload.orderSnapshot;
                break;
            case 'SalesOrderLineItemAdded':
                this.lineItems.push((event.payload as any).item);
                break;
            case 'SalesOrderLineItemRemoved':
                this.lineItems = this.lineItems.filter(i => i.lineId !== (event.payload as any).lineId);
                break;
            case 'SalesOrderCancelled':
                this.status = 'CANCELLED';
                break;
            case 'OrderHoldApplied':
                this.onHold = true;
                break;
            case 'OrderHoldReleased':
                this.onHold = false;
                break;
            default:
                break;
        }
    }
}

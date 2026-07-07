import { AggregateRoot } from '@cosmy/shared-kernel/src/domain/AggregateRoot';
import { DomainEvent } from '@cosmy/shared-kernel/src/domain/DomainEvent';

export class ShipmentLine {
  constructor(
    public readonly productId: string,
    public readonly shippedQuantity: number
  ) {}
}

export class Package {
  constructor(
    public readonly packageId: string,
    public readonly weight: number,
    public readonly dimensions: string,
    public trackingNumber: string | null
  ) {}
}

export class Shipment extends AggregateRoot<string> {
  private lines: ShipmentLine[] = [];
  private packages: Package[] = [];

  private constructor(
    id: string,
    public readonly orderId: string,
    public readonly warehouseId: string,
    public carrier: string,
    public proofOfDeliveryUrl: string | null,
    public readonly dispatchedAt: Date
  ) {
    super(id);
  }

  public static dispatch(
    id: string,
    orderId: string,
    warehouseId: string,
    carrier: string,
    lines: ShipmentLine[],
    packages: Package[]
  ): Shipment {
    const shipment = new Shipment(id, orderId, warehouseId, carrier, null, new Date());
    shipment.lines = lines;
    shipment.packages = packages;
    
    // Note: Mutating shipment lines or packages post-dispatch is illegal. 
    // Corrections require a Return or Adjustment process.
    
    shipment.addDomainEvent(new ShipmentDispatchedEvent(id, orderId));
    return shipment;
  }

  public recordProofOfDelivery(url: string): void {
    if (this.proofOfDeliveryUrl) throw new Error('Proof of delivery already recorded.');
    this.proofOfDeliveryUrl = url;
    this.addDomainEvent(new ProofOfDeliveryRecordedEvent(this.id));
  }
}

export class ShipmentDispatchedEvent extends DomainEvent { 
  constructor(public readonly shipmentId: string, public readonly orderId: string) { super(); } 
}
export class ProofOfDeliveryRecordedEvent extends DomainEvent { 
  constructor(public readonly shipmentId: string) { super(); } 
}

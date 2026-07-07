# Inventory Event Catalog v1.0.0

## 1. Value Objects
### `Quantity`
All quantities must be explicitly defined with precision-safe strings and units of measure.
```typescript
interface Quantity {
  amount: string; // Precision-safe decimal string
  unitOfMeasure: string; // e.g., 'EA', 'KG', 'L'
}
```

## 2. The Enterprise Envelope Schema
All events inherit this strict wrapper.
```typescript
interface EventEnvelope<T> {
  eventId: string;
  eventType: string;
  eventVersion: string;
  schemaUri: string; // e.g., 'inventory/events/StockMoved/v1'

  aggregateId: string;
  aggregateType: string;
  streamId: string;
  sequenceNumber: number;
  producer: string;

  timestamp: string; // ISO-8601 UTC

  tenantId: string;
  correlationId: string;
  causationId: string;
  data: T;
}
```

## 3. Ledger Events (Truth A)
The absolute canonical truth of physical movement.

### `StockMoved`
```typescript
interface StockMoved_v1 {
  movementId: string;
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: Quantity;
  movementType: 'RECEIPT' | 'DISPATCH' | 'TRANSFER' | 'ADJUSTMENT' | 'SCRAP';
  occurredAt: string; // ISO-8601 UTC
}
```

## 4. Reservation Events (Truth B)
Manages claims against future physical capacity.

### `ReservationCreated`
```typescript
interface ReservationCreated_v1 {
  reservationId: string;
  productId: string;
  sourceLocationId: string;
  requestedQuantity: Quantity;
  requestedBy: string; // Identifies the external domain or user
  expiresAt?: string;
}
```
### `ReservationAllocated`
```typescript
interface ReservationAllocated_v1 {
  reservationId: string;
  allocatedQuantity: Quantity;
}
```
### `ReservationReleased`
```typescript
interface ReservationReleased_v1 {
  reservationId: string;
  releasedQuantity: Quantity;
  reason: string;
}
```
### `ReservationExpired`
```typescript
interface ReservationExpired_v1 {
  reservationId: string;
}
```
### `ReservationFulfilled`
```typescript
interface ReservationFulfilled_v1 {
  reservationId: string;
  fulfilledQuantity: Quantity;
  movementId: string; // Links to the physical StockMoved event
}
```

## 5. Cost Layer Events (Truth C)
Manages inventory valuation and cost depletion.

### `CostLayerCreated`
```typescript
interface CostLayerCreated_v1 {
  layerId: string;
  productId: string;
  locationId: string;
  initialQuantity: Quantity;
  unitCost: number; // Stored as number or decimal string depending on currency precision policies
  sourceMovementId: string; // Links to Receipt StockMoved
}
```
### `CostLayerConsumed`
```typescript
interface CostLayerConsumed_v1 {
  layerId: string;
  consumedQuantity: Quantity;
  remainingQuantity: Quantity;
  targetMovementId: string; // Links to Dispatch StockMoved
}
```
### `CostLayerAdjusted`
```typescript
interface CostLayerAdjusted_v1 {
  layerId: string;
  quantityAdjustment: Quantity;
  costAdjustment: number;
  reason: string;
}
```

## 6. Location Events (Topology)
Manages the location graph.

### `LocationCreated`
```typescript
interface LocationCreated_v1 {
  locationId: string;
  locationType: 'WAREHOUSE' | 'ZONE' | 'BIN' | 'TRANSIT' | 'SCRAP' | 'CUSTOMER' | 'SUPPLIER';
  parentLocationId?: string;
}
```
### `LocationActivated` & `LocationDeactivated`
```typescript
interface LocationActivated_v1 { locationId: string; }
interface LocationDeactivated_v1 { locationId: string; reason: string; }
```
### `LocationMoved`
```typescript
interface LocationMoved_v1 {
  locationId: string;
  newParentLocationId: string;
}
```

## 7. Bucket Events (Consistency Mechanics)
Saga mechanics for availability locking and double-entry transfers.

### `BucketStockReceived` & `BucketStockDispatched`
```typescript
interface BucketStockReceived_v1 {
  productId: string;
  locationId: string;
  quantity: Quantity;
  movementId: string; // Ties back to atomic StockMoved
}
interface BucketStockDispatched_v1 {
  productId: string;
  locationId: string;
  quantity: Quantity;
  movementId: string;
}
```
### `BucketStockTransferredOut` & `BucketStockTransferredIn`
```typescript
interface BucketStockTransferredOut_v1 {
  productId: string;
  sourceLocationId: string;
  targetLocationId: string;
  quantity: Quantity;
  movementId: string; // The universal transfer saga identifier
}
interface BucketStockTransferredIn_v1 {
  productId: string;
  targetLocationId: string;
  sourceLocationId: string;
  quantity: Quantity;
  movementId: string;
}
```
### `BucketAllocationReserved` & `BucketAllocationReleased`
```typescript
interface BucketAllocationReserved_v1 {
  productId: string;
  locationId: string;
  reservationId: string; // Ties back to Reservation Ledger
  quantity: Quantity;
}
interface BucketAllocationReleased_v1 {
  productId: string;
  locationId: string;
  reservationId: string;
  quantity: Quantity;
}
```

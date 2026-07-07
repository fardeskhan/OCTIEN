export enum InventoryEventTypes {
  // Product Lifecycle
  ProductCreated = 'Inventory.ProductCreated',
  ProductActivated = 'Inventory.ProductActivated',
  ProductArchived = 'Inventory.ProductArchived',
  
  // Batch Lifecycle
  BatchCreated = 'Inventory.BatchCreated',
  BatchReceived = 'Inventory.BatchReceived',
  BatchAvailable = 'Inventory.BatchAvailable',
  BatchReserved = 'Inventory.BatchReserved',
  BatchClosed = 'Inventory.BatchClosed',
  
  // Reservation Lifecycle
  ReservationCreated = 'Inventory.ReservationCreated',
  ReservationReleased = 'Inventory.ReservationReleased',
  ReservationExpired = 'Inventory.ReservationExpired',
  ReservationFulfilled = 'Inventory.ReservationFulfilled',
  
  // Stock Ledger
  StockReceived = 'Inventory.StockReceived',
  StockAdjusted = 'Inventory.StockAdjusted',
  StockTransferred = 'Inventory.StockTransferred',
  StockReserved = 'Inventory.StockReserved',
  StockReleased = 'Inventory.StockReleased',
  StockRemoved = 'Inventory.StockRemoved',
}

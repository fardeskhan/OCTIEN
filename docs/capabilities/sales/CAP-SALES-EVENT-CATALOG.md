# CAP-SALES Event Catalog

## Aggregate: SalesOrder
- `SalesOrderCreated`: The initialization of commercial intent.
- `SalesOrderApproved`: Manual or automated approval of draft intent.
- `SalesOrderConfirmed`: The final commitment to fulfill the order.
- `SalesOrderCancelled`: Reversal of commercial intent.
- `OrderHoldApplied`: Operational block on lifecycle progression.
- `OrderHoldReleased`: Removal of operational block.
- `SalesOrderLineItemAdded`: Incremental increase in commercial intent.
- `SalesOrderLineItemRemoved`: Incremental decrease in commercial intent.

## Aggregate: Delivery (Logical boundary mapped in ACL)
- `DeliveryCompleted`: Notification of successful physical fulfillment.
- `DeliveryPartiallyCompleted`: Notification of partial physical fulfillment.
- `ReturnReceived`: Notification of physical goods returned.

# CAP-SALES Integration Contracts

CAP-SALES integrates with external bounded contexts via Anti-Corruption Layers (ACLs) that translate Sales language into downstream intent, carrying absolute Traceability (`correlationId`, `causationId`).

## Upstream Integration (Inventory)
CAP-SALES consumes physical fulfillment facts to trigger financial intents.
**Triggered Commands:**
- `InventoryDispatchRequested`: Demands physical dispatch based on commercial delivery intent.
- `InventoryReturnRequested`: Demands physical intake based on commercial return intent.

## Downstream Integration (Billing)
CAP-SALES translates fulfillment reality into invoicing reality.
**Triggered Commands:**
- `InvoiceRequested`: Translates `DeliveryCompleted` into an invoice request.
- `InvoiceAdjustmentRequested`: Translates `DeliveryPartiallyCompleted` into an invoice adjustment request.
- `CreditNoteRequested`: Translates `ReturnReceived` into a credit note request.

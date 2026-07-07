# ADR-PROC-002: Domain Boundaries

## Status
Frozen

## Mission
Define absolute ownership boundaries between Procurement, Inventory, Finance, and Suppliers to prevent monolith coupling and scope bleed.

---

## Boundary Rule 1: The Golden Triad
- **Procurement** owns commitments.
- **Inventory** owns quantities.
- **Finance** owns money.

This separation prevents Procurement from artificially managing stock or accounting.

## Boundary Rule 2: Purchase Order Ownership
- **Procurement** natively owns the `Purchase Order`.
- **Inventory must never modify** PO Status, PO Quantity, or PO Pricing.
- Inventory consumes commitments; it does not govern them.

## Boundary Rule 3: Goods Receipt Ownership
- **Procurement**: Requests Receipt (e.g. `GoodsReceiptRequested`).
- **Inventory**: Records Receipt (e.g. `InventoryReceived`, `InventoryRejected`, `InventoryReturned`).
- Inventory events are the *authoritative* physical truth, not Procurement events.

## Boundary Rule 4: Supplier Invoice Ownership
- **Procurement** owns Expected Cost (e.g. `PO = $10,000`).
- **Finance** owns Actual Liability (e.g. `Invoice = $10,200`).
- Procurement does not own accounting logic. Variance resolution can involve Procurement, but the liability resides exclusively in Finance.

## Boundary Rule 5: Supplier Master Ownership
- The **Supplier Aggregate** is owned entirely by CAP-PROCUREMENT for v1.0.0.
- It is not owned by Finance, nor is it abstracted into a global master-data capability at this stage. Ownership must remain localized to commercial engagement.

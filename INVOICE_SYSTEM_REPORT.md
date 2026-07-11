# INVOICE_SYSTEM_REPORT.md

**Date:** 2026-07-11 · Architecture detail in INVOICE_ENGINE_DESIGN.md.

## Lifecycle (all persisting, AR-reconciling)
Draft/Issue (create with line items, product autofill, GST) → **Partial payment** → **Mark Paid** → **Void**
(kept for audit, AR written off) → **Delete** (soft, blocked if paid). Every action posts to
`receivableEntry` and emits an **audit-log entry**.

## Output
Preview (3 swappable templates: Standard / Corporate / Minimal) · Print · Download PDF (browser-native) ·
email-ready HTML. Templates carry logo, brand colors, tax breakdown (CGST/SGST), payment instructions,
terms & conditions, signature block — all sourced from the **Business row** (editable in Business Settings),
so client branding changes restyle invoices with zero code.

## Template independence (the future-format requirement)
`buildInvoiceDocument()` (data) → `InvoiceDocument` contract → template registry (presentation). A client
template = one new component + one registry line; business logic untouched.

## Honest gaps
- **Credit notes** — not built (needs a CreditNote model + AR contra entries).
- **Approval step** — no invoice-approval workflow (ApprovalRequest engine exists but is not wired to invoices).
- **Email sending** — output is email-ready, but no SMTP integration.
- GST is a derived 18% breakdown, not a per-line tax engine.

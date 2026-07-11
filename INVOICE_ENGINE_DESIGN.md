# INVOICE_ENGINE_DESIGN.md — COSMY ERP Invoice Generator (Phase 2E)

**Date:** 2026-07-11
**Status:** Built & verified (`tsc --noEmit` EXIT 0, `next build` success, route `/sales/invoices/[id]` live).

## Goal
A professional invoice generator with **preview, print, and download (PDF)**, architected so the client can
drop in **their own invoice format later** — swapping layout, logo, colors, footer, and payment instructions
**without touching business logic**.

## The core principle: data ⟂ presentation
The single contract between the two halves is `InvoiceDocument` (a normalized, template-agnostic model).

```
CustomerInvoice (Prisma)                          BrandingConfig (per business)
        │                                                   │
        ▼                                                   ▼
buildInvoiceDocument()  ──►  InvoiceDocument  ──►  Template (Standard|Corporate|Minimal)  ──►  HTML → Print/PDF
   (business logic)            (contract)              (presentation only)
```

- **Business logic never renders.** `buildInvoiceDocument(invoiceId, businessId)` fetches the invoice,
  lines, customer, and business and returns an `InvoiceDocument`. Templates never import Prisma.
- **Templates never fetch.** Each template is a pure function `(InvoiceDocument, BrandingConfig) → JSX`.
  Adding/replacing one cannot break data or other templates.
- **Branding is separate again.** `BrandingConfig` (logo/monogram, colors, footer, payment terms) lives in a
  per-business registry, resolved by business slug at render time.

## Files
| File | Role |
|---|---|
| `src/lib/invoice/types.ts` | `InvoiceDocument`, `InvoiceLineItem`, `InvoiceTotals`, `BrandingConfig`, `InvoiceTemplateId` — the contract |
| `src/lib/invoice/build-invoice-document.ts` | **Business logic** — Prisma → `InvoiceDocument` (totals, parties, line items) |
| `src/lib/invoice/branding.ts` | Per-business `BrandingConfig` registry + `DEFAULT_BRANDING` fallback |
| `src/lib/invoice/templates/standard-template.tsx` | Standard template |
| `src/lib/invoice/templates/corporate-template.tsx` | Corporate template |
| `src/lib/invoice/templates/minimal-template.tsx` | Custom/Minimal template (client-brandable base) |
| `src/lib/invoice/template-registry.tsx` | Registry + `renderInvoiceTemplate(id, props)` — the plug-in point |
| `src/app/(dashboard)/sales/invoices/[id]/page.tsx` | Server route: RBAC + build doc + resolve branding |
| `src/app/(dashboard)/sales/invoices/[id]/invoice-preview.tsx` | Client: template switcher, print, download |

## How to add the client's future template (the whole point)
1. Add `templates/acme-template.tsx` — a pure `(doc, branding) → JSX` component (copy Minimal as a base).
2. Add one line to `INVOICE_TEMPLATES` in `template-registry.tsx`.
3. (Optional) add the client's `BrandingConfig` (logo/colors/footer) in `branding.ts`.

No change to `buildInvoiceDocument`, the preview UI, the route, or any other template. The switcher, print,
and PDF paths pick it up automatically.

## Preview / Print / Download / Email
- **Preview:** rendered live in-app with a template switcher (Standard / Corporate / Custom).
- **Print & Download PDF:** the print path uses a scoped `@media print` stylesheet that isolates
  `#invoice-print-root` (A4, zero margins) and hides all app chrome. "Download PDF" invokes the browser's
  native print-to-PDF — **zero new dependencies**, produces a real, correctly-paginated PDF.
- **Server-side PDF (drop-in later):** because a template is a pure function of `(doc, branding)`, the same
  component can be rendered to a PDF on the server (e.g. a headless renderer / `@react-pdf`) behind a
  `/invoices/[id]/pdf` route with no changes to templates or business logic. This is the intended upgrade
  path for emailed/attached PDFs.
- **Email-ready:** `InvoiceDocument` + a template = self-contained HTML, suitable for an email body or PDF
  attachment. (Actual sending is out of scope and gated — no SMTP configured.)

## Data backing (real, reconciled)
Seeded `CustomerInvoiceLine` rows now back every invoice; line totals reconcile **exactly** to
`CustomerInvoice.totalAmount` (verified: sample invoice line-sum == total). Preview shows real line items,
real customer, real balance due — nothing hardcoded. Branding is defined for **Salam Cola** (red) and
**COSMY UCO** (green); other businesses fall back to `DEFAULT_BRANDING`.

## Known limitations (honest)
- No GST/tax breakdown line yet (not modeled on the invoice); `InvoiceTotals.taxLabel/taxAmount` exist in the
  contract for when it is.
- Seller registered address is a placeholder (`COSMY Group, India`) — businesses have no address fields yet;
  add them to `Business` and map in `buildInvoiceDocument` when available.
- PDF is browser-native print-to-PDF (excellent fidelity, user-initiated). Server-rendered PDF is the
  documented next step for automated/emailed delivery.

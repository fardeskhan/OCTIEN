/**
 * Invoice engine — normalized document model.
 *
 * This is the ONLY contract templates depend on. Business logic (see build-invoice-document.ts)
 * produces an `InvoiceDocument`; templates consume it. Swapping or adding a template never touches
 * the data layer, and changing the data layer never touches a template.
 */

export type InvoiceTemplateId = "standard" | "corporate" | "minimal";

export interface InvoiceParty {
  name: string;
  addressLines: string[];
  email?: string;
  phone?: string;
  taxId?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceTotals {
  subtotal: number;
  taxLabel?: string;
  taxAmount?: number;
  total: number;
  paid: number;
  balanceDue: number;
}

/** GST-style tax breakdown, computed from the invoice total. Reconciles: taxable + cgst + sgst = total. */
export interface TaxSummary {
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
}

export interface InvoiceDocument {
  /** Stable invoice id (for links / actions). */
  id: string;
  /** Human invoice number, e.g. INV-salam-cola-0001. */
  number: string;
  status: string;
  issueDate: string;
  dueDate: string;
  currencyCode: string;
  seller: InvoiceParty;
  billTo: InvoiceParty;
  lineItems: InvoiceLineItem[];
  totals: InvoiceTotals;
  taxSummary?: TaxSummary;
  notes?: string;
}

/**
 * Branding is fully separate from the document. The client will provide their own later — this is
 * the swap point: logos, colors, footer, and payment instructions live here, not in business logic.
 */
export interface BrandingConfig {
  /** Short monogram used when no logo image is supplied (e.g. "SC"). */
  logoMonogram: string;
  /** Optional data-URI / URL logo. Templates fall back to the monogram when absent. */
  logoUrl?: string;
  brandName: string;
  tagline?: string;
  primaryColor: string;
  accentColor: string;
  footerNote: string;
  paymentInstructions: string;
  termsAndConditions: string;
  /** Name printed above the signature line. Defaults to the brand name. */
  signatoryName?: string;
}

export interface InvoiceRenderProps {
  doc: InvoiceDocument;
  branding: BrandingConfig;
}

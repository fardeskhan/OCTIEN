/**
 * Per-business branding registry.
 *
 * This is the deliberate swap point for "client will provide their own invoice format later":
 * to rebrand invoices for a business, change/extend this map — no template or data-layer edits.
 * A business with no entry falls back to `DEFAULT_BRANDING`.
 */
import type { BrandingConfig } from "./types";

const DEFAULT_TERMS =
  "1. Payment is due by the date stated above. 2. Goods once sold are covered by the applicable warranty only. " +
  "3. Interest at 1.5% per month may apply to overdue balances. 4. Disputes are subject to local jurisdiction.";

export const DEFAULT_BRANDING: BrandingConfig = {
  logoMonogram: "CB",
  brandName: "COSMY Business",
  tagline: "COSMY Group",
  primaryColor: "#1e293b",
  accentColor: "#0ea5e9",
  footerNote: "Thank you for your business.",
  paymentInstructions: "Please settle within the due date via bank transfer to the account on file.",
  termsAndConditions: DEFAULT_TERMS,
};

const BRANDING_BY_SLUG: Record<string, BrandingConfig> = {
  "salam-cola": {
    logoMonogram: "SC",
    brandName: "Salam Cola",
    tagline: "Refreshment, bottled right.",
    primaryColor: "#b91c1c",
    accentColor: "#ef4444",
    footerNote: "Salam Cola — a COSMY Group company. Thank you for stocking Salam Cola.",
    paymentInstructions:
      "Payment due within 15 days. Bank transfer to Salam Cola Operating A/C (see statement) or UPI on request.",
    termsAndConditions: DEFAULT_TERMS,
  },
  "cosmy-uco": {
    logoMonogram: "UCO",
    brandName: "COSMY UCO",
    tagline: "Used cooking oil, responsibly recovered.",
    primaryColor: "#15803d",
    accentColor: "#22c55e",
    footerNote: "COSMY UCO — a COSMY Group company. Certified collection & supply.",
    paymentInstructions:
      "Payment due within 30 days. Remit to COSMY UCO Operating A/C. Reference the invoice number on transfer.",
    termsAndConditions: DEFAULT_TERMS,
  },
};

export function getBranding(businessSlug: string | null | undefined): BrandingConfig {
  if (!businessSlug) return DEFAULT_BRANDING;
  return BRANDING_BY_SLUG[businessSlug] ?? DEFAULT_BRANDING;
}

/** Fields we read off a Business row to build branding (DB is the source of truth). */
export interface BusinessBrandingSource {
  name: string;
  slug: string;
  tagline?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  footerNote?: string | null;
  paymentInstructions?: string | null;
  termsAndConditions?: string | null;
}

/**
 * Build branding from a Business row. DB values win; anything unset falls back to the code
 * registry (by slug) and then DEFAULT_BRANDING. This is why editing a business in Settings
 * immediately restyles its invoices — with no template or business-logic change.
 */
export function brandingFromBusiness(b: BusinessBrandingSource): BrandingConfig {
  const base = BRANDING_BY_SLUG[b.slug] ?? DEFAULT_BRANDING;
  const monogram = b.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase() || base.logoMonogram;
  return {
    logoMonogram: monogram,
    logoUrl: b.logoUrl ?? base.logoUrl,
    brandName: b.name || base.brandName,
    tagline: b.tagline ?? base.tagline,
    primaryColor: b.primaryColor ?? base.primaryColor,
    accentColor: b.accentColor ?? base.accentColor,
    footerNote: b.footerNote ?? base.footerNote,
    paymentInstructions: b.paymentInstructions ?? base.paymentInstructions,
    termsAndConditions: b.termsAndConditions ?? base.termsAndConditions,
    signatoryName: b.name || base.brandName,
  };
}

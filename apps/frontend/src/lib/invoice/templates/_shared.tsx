import { formatINR } from "@/lib/currency";
import { branding as appBranding } from "@/lib/branding";
import type { BrandingConfig, InvoiceDocument } from "../types";

/**
 * Small, non-intrusive platform credit for exported / printed documents. The seller identity on
 * the invoice remains the business entity; this only attributes the software (OCTIEN by Aeterex).
 */
export function SystemCredit() {
  return (
    <div className="mt-2 text-center text-[9px] uppercase tracking-[0.15em] text-slate-400">
      Generated with {appBranding.productName} · {appBranding.company.poweredBy}
    </div>
  );
}

/** Brand logo — image if provided, else a colored monogram tile. */
export function BrandLogo({ branding, size = 56 }: { branding: BrandingConfig; size?: number }) {
  if (branding.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={branding.logoUrl} alt={branding.brandName} style={{ height: size, width: size, objectFit: "contain" }} className="rounded bg-white p-1" />;
  }
  return (
    <div className="flex items-center justify-center rounded-md font-bold text-white" style={{ height: size, width: size, backgroundColor: branding.primaryColor }}>
      {branding.logoMonogram}
    </div>
  );
}

export function TaxSummaryBlock({ doc, color }: { doc: InvoiceDocument; color: string }) {
  if (!doc.taxSummary) return null;
  const t = doc.taxSummary;
  const pct = (r: number) => `${(r * 100).toFixed(0)}%`;
  return (
    <div className="rounded-md border border-slate-200 p-3 text-xs">
      <div className="mb-1 font-semibold uppercase tracking-wider" style={{ color }}>Tax Summary</div>
      <div className="flex justify-between"><span className="text-slate-500">Taxable Value</span><span>{formatINR(t.taxableValue)}</span></div>
      <div className="flex justify-between"><span className="text-slate-500">CGST ({pct(t.cgstRate)})</span><span>{formatINR(t.cgstAmount)}</span></div>
      <div className="flex justify-between"><span className="text-slate-500">SGST ({pct(t.sgstRate)})</span><span>{formatINR(t.sgstAmount)}</span></div>
      <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-semibold"><span>Invoice Total</span><span>{formatINR(doc.totals.total)}</span></div>
    </div>
  );
}

export function TermsBlock({ branding }: { branding: BrandingConfig }) {
  return (
    <div className="text-[11px] text-slate-500">
      <div className="font-semibold text-slate-600">Terms &amp; Conditions</div>
      <div>{branding.termsAndConditions}</div>
    </div>
  );
}

export function SignatureBlock({ branding }: { branding: BrandingConfig }) {
  return (
    <div className="text-right text-xs">
      <div className="mb-10 text-slate-400">For {branding.signatoryName ?? branding.brandName}</div>
      <div className="ml-auto w-48 border-t border-slate-400 pt-1 text-slate-600">Authorised Signatory</div>
    </div>
  );
}

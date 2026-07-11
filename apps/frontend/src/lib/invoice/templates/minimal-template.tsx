import { formatINR } from "@/lib/currency";
import type { InvoiceRenderProps } from "../types";
import { BrandLogo, TaxSummaryBlock, TermsBlock, SignatureBlock } from "./_shared";

/**
 * Minimal template — understated, whitespace-heavy. Doubles as the "Custom" starting point:
 * it reads all branding from BrandingConfig, so a client's own look drops in by editing branding
 * (or adding a new template alongside this one) with zero business-logic changes.
 */
export function MinimalTemplate({ doc, branding }: InvoiceRenderProps) {
  return (
    <div className="invoice-sheet bg-white text-slate-900 p-12 text-[13px] leading-relaxed" style={{ width: "210mm", minHeight: "297mm", margin: "0 auto" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo branding={branding} size={40} />
          <div className="text-lg font-semibold tracking-tight">{branding.brandName}</div>
        </div>
        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Invoice</div>
      </div>

      <div className="mt-16 flex items-end justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-400">Billed to</div>
          <div className="mt-1 text-base">{doc.billTo.name}</div>
          {doc.billTo.email && <div className="text-slate-500">{doc.billTo.email}</div>}
        </div>
        <div className="text-right text-sm text-slate-500">
          <div>{doc.number}</div>
          <div>{doc.issueDate} → {doc.dueDate}</div>
        </div>
      </div>

      <table className="mt-12 w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-300 text-left text-[11px] uppercase tracking-wider text-slate-400">
            <th className="py-2 font-normal">Description</th>
            <th className="py-2 text-right font-normal">Qty</th>
            <th className="py-2 text-right font-normal">Unit</th>
            <th className="py-2 text-right font-normal">Amount</th>
          </tr>
        </thead>
        <tbody>
          {doc.lineItems.map((l, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-3">{l.description}</td>
              <td className="py-3 text-right tabular-nums">{l.quantity.toLocaleString("en-IN")}</td>
              <td className="py-3 text-right tabular-nums">{formatINR(l.unitPrice)}</td>
              <td className="py-3 text-right tabular-nums">{formatINR(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 grid grid-cols-2 gap-8">
        <TaxSummaryBlock doc={doc} color={branding.accentColor} />
        <div className="text-sm">
          <div className="flex justify-between text-slate-500"><span>Subtotal</span><span className="tabular-nums">{formatINR(doc.totals.subtotal)}</span></div>
          <div className="flex justify-between text-slate-500"><span>Paid</span><span className="tabular-nums">{formatINR(doc.totals.paid)}</span></div>
          <div className="mt-2 flex justify-between border-t border-slate-300 pt-2 font-semibold">
            <span>Balance Due</span><span className="tabular-nums" style={{ color: branding.accentColor }}>{formatINR(doc.totals.balanceDue)}</span>
          </div>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-2 items-end gap-8">
        <div className="space-y-2 text-xs text-slate-400">
          <div>{branding.paymentInstructions}</div>
          <TermsBlock branding={branding} />
        </div>
        <SignatureBlock branding={branding} />
      </div>

      <div className="mt-8 text-center text-xs text-slate-400">{branding.footerNote}</div>
    </div>
  );
}

import { formatINR } from "@/lib/currency";
import type { InvoiceRenderProps } from "../types";
import { BrandLogo, TaxSummaryBlock, TermsBlock, SignatureBlock } from "./_shared";

/** Standard template — classic, balanced business invoice. */
export function StandardTemplate({ doc, branding }: InvoiceRenderProps) {
  return (
    <div className="invoice-sheet bg-white text-slate-900 p-10 text-[13px] leading-relaxed" style={{ width: "210mm", minHeight: "297mm", margin: "0 auto" }}>
      <div className="flex items-start justify-between border-b-2 pb-6" style={{ borderColor: branding.primaryColor }}>
        <div className="flex items-center gap-3">
          <BrandLogo branding={branding} />
          <div>
            <div className="text-xl font-bold" style={{ color: branding.primaryColor }}>{branding.brandName}</div>
            {branding.tagline && <div className="text-xs text-slate-500">{branding.tagline}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tracking-wide" style={{ color: branding.primaryColor }}>INVOICE</div>
          <div className="mt-1 text-sm font-medium">{doc.number}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-8">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Bill To</div>
          <div className="mt-1 font-semibold">{doc.billTo.name}</div>
          {doc.billTo.addressLines.map((l, i) => <div key={i} className="text-slate-600">{l}</div>)}
          {doc.billTo.email && <div className="text-slate-600">{doc.billTo.email}</div>}
          {doc.billTo.phone && <div className="text-slate-600">{doc.billTo.phone}</div>}
        </div>
        <div className="text-right text-sm">
          <div className="flex justify-end gap-6"><span className="text-slate-400">Issue Date</span><span className="font-medium">{doc.issueDate}</span></div>
          <div className="flex justify-end gap-6"><span className="text-slate-400">Due Date</span><span className="font-medium">{doc.dueDate}</span></div>
          <div className="flex justify-end gap-6"><span className="text-slate-400">Status</span><span className="font-medium">{doc.status.replace("_", " ")}</span></div>
        </div>
      </div>

      <table className="mt-8 w-full border-collapse">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-white" style={{ backgroundColor: branding.primaryColor }}>
            <th className="p-3 font-semibold">Description</th>
            <th className="p-3 text-right font-semibold">Qty</th>
            <th className="p-3 text-right font-semibold">Unit Price</th>
            <th className="p-3 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {doc.lineItems.map((l, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="p-3">{l.description}</td>
              <td className="p-3 text-right">{l.quantity.toLocaleString("en-IN")}</td>
              <td className="p-3 text-right">{formatINR(l.unitPrice)}</td>
              <td className="p-3 text-right font-medium">{formatINR(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <TaxSummaryBlock doc={doc} color={branding.primaryColor} />
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatINR(doc.totals.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Paid</span><span>{formatINR(doc.totals.paid)}</span></div>
          <div className="mt-2 flex justify-between border-t-2 pt-2 text-base font-bold" style={{ borderColor: branding.primaryColor }}>
            <span>Balance Due</span><span style={{ color: branding.primaryColor }}>{formatINR(doc.totals.balanceDue)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-8">
        <div className="space-y-3">
          <div className="text-xs text-slate-500">
            <div className="font-semibold text-slate-600">Payment Instructions</div>
            <div>{branding.paymentInstructions}</div>
          </div>
          <TermsBlock branding={branding} />
        </div>
        <SignatureBlock branding={branding} />
      </div>

      <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">{branding.footerNote}</div>
    </div>
  );
}

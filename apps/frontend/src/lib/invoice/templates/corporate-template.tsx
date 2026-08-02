import { formatINR } from "@/lib/currency";
import type { InvoiceRenderProps } from "../types";
import { BrandLogo, TaxSummaryBlock, TermsBlock, SignatureBlock, SystemCredit } from "./_shared";

/** Corporate template — bold colored header band, striped rows, prominent balance-due box. */
export function CorporateTemplate({ doc, branding }: InvoiceRenderProps) {
  return (
    <div className="invoice-sheet bg-white text-slate-900 text-[13px] leading-relaxed" style={{ width: "210mm", minHeight: "297mm", margin: "0 auto" }}>
      <div className="px-10 py-8 text-white" style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.accentColor})` }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo branding={branding} size={48} />
            <div>
              <div className="text-2xl font-black tracking-tight">{branding.brandName}</div>
              {branding.tagline && <div className="text-sm opacity-90">{branding.tagline}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black tracking-widest opacity-95">INVOICE</div>
            <div className="mt-1 text-sm opacity-90">{doc.number}</div>
          </div>
        </div>
      </div>

      <div className="px-10 py-8">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Billed To</div>
            <div className="mt-1 text-base font-semibold">{doc.billTo.name}</div>
            {doc.billTo.addressLines.map((l, i) => <div key={i} className="text-slate-600">{l}</div>)}
            {doc.billTo.email && <div className="text-slate-600">{doc.billTo.email}</div>}
            {doc.billTo.phone && <div className="text-slate-600">{doc.billTo.phone}</div>}
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Issued</span><span className="font-medium">{doc.issueDate}</span></div>
            <div className="mt-1 flex justify-between"><span className="text-slate-400">Due</span><span className="font-medium">{doc.dueDate}</span></div>
            <div className="mt-1 flex justify-between"><span className="text-slate-400">Status</span><span className="font-medium">{doc.status.replace("_", " ")}</span></div>
          </div>
        </div>

        <table className="mt-8 w-full border-collapse">
          <thead>
            <tr className="border-b-2 text-left text-[11px] uppercase tracking-wider text-slate-500" style={{ borderColor: branding.primaryColor }}>
              <th className="py-3 font-semibold">Description</th>
              <th className="py-3 text-right font-semibold">Qty</th>
              <th className="py-3 text-right font-semibold">Unit Price</th>
              <th className="py-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.lineItems.map((l, i) => (
              <tr key={i} className={i % 2 ? "bg-slate-50" : ""}>
                <td className="px-2 py-3">{l.description}</td>
                <td className="px-2 py-3 text-right">{l.quantity.toLocaleString("en-IN")}</td>
                <td className="px-2 py-3 text-right">{formatINR(l.unitPrice)}</td>
                <td className="px-2 py-3 text-right font-medium">{formatINR(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 flex items-end justify-between gap-8">
          <div className="max-w-xs space-y-3">
            <div className="text-xs text-slate-500">
              <div className="font-semibold text-slate-600">Payment Instructions</div>
              <div>{branding.paymentInstructions}</div>
            </div>
            <TaxSummaryBlock doc={doc} color={branding.primaryColor} />
          </div>
          <div className="w-72">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span>{formatINR(doc.totals.subtotal)}</span></div>
            <div className="mt-1 flex justify-between text-sm"><span className="text-slate-500">Paid</span><span>{formatINR(doc.totals.paid)}</span></div>
            <div className="mt-3 flex items-center justify-between rounded-lg px-4 py-3 text-white" style={{ backgroundColor: branding.primaryColor }}>
              <span className="text-sm font-semibold">Balance Due</span>
              <span className="text-lg font-black">{formatINR(doc.totals.balanceDue)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 items-end gap-8">
          <TermsBlock branding={branding} />
          <SignatureBlock branding={branding} />
        </div>

        <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">{branding.footerNote}</div>
        <SystemCredit />
      </div>
    </div>
  );
}

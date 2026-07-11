"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Printer, Download, CheckCircle2, Ban, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { BrandingConfig, InvoiceDocument, InvoiceTemplateId } from "@/lib/invoice/types";
import { INVOICE_TEMPLATES, DEFAULT_TEMPLATE_ID, renderInvoiceTemplate } from "@/lib/invoice/template-registry";
import { recordInvoicePayment, voidInvoice, deleteInvoice } from "@/app/actions/invoice";

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #invoice-print-root, #invoice-print-root * { visibility: visible !important; }
  #invoice-print-root { position: absolute; inset: 0; margin: 0; padding: 0; }
  .invoice-sheet { box-shadow: none !important; }
  @page { size: A4; margin: 0; }
}
`;

export function InvoicePreview({ doc, branding }: { doc: InvoiceDocument; branding: BrandingConfig }) {
  const router = useRouter();
  const [templateId, setTemplateId] = React.useState<InvoiceTemplateId>(DEFAULT_TEMPLATE_ID);
  const [saving, setSaving] = React.useState(false);

  async function markPaid() {
    if (doc.totals.balanceDue <= 0) return;
    setSaving(true);
    try {
      await recordInvoicePayment(doc.id, doc.totals.balanceDue);
      toast.success("Payment recorded — invoice marked paid");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  }

  async function voidIt() {
    setSaving(true);
    try {
      await voidInvoice(doc.id);
      toast.success("Invoice voided");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to void invoice");
    } finally {
      setSaving(false);
    }
  }

  async function deleteIt() {
    setSaving(true);
    try {
      await deleteInvoice(doc.id);
      toast.success("Invoice deleted");
      router.push("/sales/invoices");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete invoice");
    } finally {
      setSaving(false);
    }
  }

  const isCancelled = doc.status === "CANCELLED";
  const isPaid = doc.status === "PAID";

  return (
    <div className="flex flex-col gap-4 p-6">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {/* Toolbar (hidden on print) */}
      <div data-print-hide className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/sales/invoices" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft className="h-4 w-4" /> Invoices
          </Link>
          <div>
            <div className="text-lg font-semibold">{doc.number}</div>
            <div className="text-xs text-muted-foreground">{branding.brandName} · {doc.status.replace("_", " ")}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            {INVOICE_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                title={t.description}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  templateId === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {doc.totals.balanceDue > 0 && !isCancelled && (
            <Button variant="outline" size="sm" onClick={markPaid} disabled={saving}>
              <CheckCircle2 className="h-4 w-4" /> {saving ? "Saving…" : "Mark Paid"}
            </Button>
          )}
          {!isCancelled && !isPaid && (
            <Button variant="outline" size="sm" onClick={voidIt} disabled={saving}>
              <Ban className="h-4 w-4" /> Void
            </Button>
          )}
          {doc.totals.paid === 0 && (
            <Button variant="destructive" size="sm" onClick={deleteIt} disabled={saving}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      {/* Preview surface */}
      <div className="overflow-x-auto rounded-lg bg-slate-200 p-6 dark:bg-slate-800">
        <div id="invoice-print-root" className="mx-auto shadow-xl" style={{ width: "210mm" }}>
          {renderInvoiceTemplate(templateId, { doc, branding })}
        </div>
      </div>
    </div>
  );
}

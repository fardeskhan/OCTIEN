"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/currency";
import { createCustomerInvoice } from "@/app/actions/invoice";

interface CustomerOpt { id: string; name: string; code: string }
interface ProductOpt { name: string; price: number }
interface Line { description: string; quantity: number; unitPrice: number }

const selectCls =
  "h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 dark:bg-input/30";

export function InvoiceCreateForm({ customers, products }: { customers: CustomerOpt[]; products: ProductOpt[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [customerId, setCustomerId] = React.useState("");
  const [paid, setPaid] = React.useState(0);
  const [lines, setLines] = React.useState<Line[]>([{ description: "", quantity: 1, unitPrice: 0 }]);

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const GST = 0.18;
  const taxable = Math.round(subtotal / (1 + GST));
  const gst = subtotal - taxable;

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function pickProduct(i: number, name: string) {
    const p = products.find((x) => x.name === name);
    if (p) updateLine(i, { description: p.name, unitPrice: p.price });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const { id } = await createCustomerInvoice({ customerId, lines, paidAmount: paid });
      toast.success("Invoice created");
      router.push(`/sales/invoices/${id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader><CardTitle className="text-base font-medium">Invoice Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="customer">Customer *</Label>
              <select id="customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={selectCls} required>
                <option value="">Select a customer…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setLines((p) => [...p, { description: "", quantity: 1, unitPrice: 0 }])}>
              <Plus className="h-4 w-4" /> Add line
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-6">
                  <Input
                    list="product-options"
                    placeholder="Description"
                    value={l.description}
                    onChange={(e) => { updateLine(i, { description: e.target.value }); pickProduct(i, e.target.value); }}
                  />
                </div>
                <div className="col-span-2">
                  <Input type="number" min={0} placeholder="Qty" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} />
                </div>
                <div className="col-span-3">
                  <Input type="number" min={0} placeholder="Unit price" value={l.unitPrice} onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })} />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button type="button" variant="ghost" size="icon" onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))} disabled={lines.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <datalist id="product-options">
              {products.map((p) => <option key={p.name} value={p.name} />)}
            </datalist>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader><CardTitle className="text-base font-medium">Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Taxable Value</span><span className="tabular-nums">{formatINR(taxable)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">GST (18%)</span><span className="tabular-nums">{formatINR(gst)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Total</span><span className="tabular-nums">{formatINR(subtotal)}</span></div>
            <div className="space-y-1.5 pt-3">
              <Label htmlFor="paid">Amount Paid Now</Label>
              <Input id="paid" type="number" min={0} value={paid} onChange={(e) => setPaid(Number(e.target.value))} />
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>Balance Due</span><span className="tabular-nums">{formatINR(Math.max(0, subtotal - paid))}</span>
            </div>
            <Button type="submit" className="mt-3 w-full" disabled={pending}>{pending ? "Creating…" : "Create Invoice"}</Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

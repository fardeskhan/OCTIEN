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
import { createQuotation } from "@/app/actions/quotation";

interface CustomerOpt {
  id: string;
  name: string;
  code: string;
}
interface VariantOpt {
  id: string;
  name: string;
  price: number;
}
interface Line {
  variantId: string;
  quantity: number;
  unitPrice: number;
}

const selectCls =
  "h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 dark:bg-input/30";

export function QuotationCreateForm({
  customers,
  variants,
}: {
  customers: CustomerOpt[];
  variants: VariantOpt[];
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [customerId, setCustomerId] = React.useState("");
  const [validUntil, setValidUntil] = React.useState("");
  const [lines, setLines] = React.useState<Line[]>([{ variantId: "", quantity: 1, unitPrice: 0 }]);

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function pickVariant(i: number, variantId: string) {
    const v = variants.find((x) => x.id === variantId);
    updateLine(i, { variantId, unitPrice: v ? v.price : 0 });
  }

  const canSubmit = customerId && lines.some((l) => l.variantId && l.quantity > 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      toast.error("Select a customer and at least one product line");
      return;
    }
    setPending(true);
    try {
      const quote = await createQuotation({
        customerId,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        lines: lines.filter((l) => l.variantId && l.quantity > 0),
      });
      toast.success(`Quotation ${quote.code} created`);
      router.push("/sales/quotations");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create quotation");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Quotation Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer">Customer *</Label>
              <select
                id="customer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={selectCls}
                required
              >
                <option value="">Select a customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="validUntil">Valid Until</Label>
              <Input
                id="validUntil"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">Line Items</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLines((p) => [...p, { variantId: "", quantity: 1, unitPrice: 0 }])}
            >
              <Plus className="h-4 w-4" /> Add line
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {variants.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No product variants exist yet. Add products in Inventory before quoting.
              </p>
            )}
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-6">
                  <select
                    value={l.variantId}
                    onChange={(e) => pickVariant(i, e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Select a product…</option>
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min={0}
                    placeholder="Qty"
                    value={l.quantity}
                    onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    min={0}
                    placeholder="Unit price"
                    value={l.unitPrice}
                    onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))}
                    disabled={lines.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="text-base font-medium">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Line items</span>
              <span className="tabular-nums">{lines.filter((l) => l.variantId).length}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatINR(subtotal)}</span>
            </div>
            <Button type="submit" className="mt-3 w-full" disabled={pending || !canSubmit}>
              {pending ? "Creating…" : "Create Quotation"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

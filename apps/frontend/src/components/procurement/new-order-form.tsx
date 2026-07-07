// @ts-nocheck
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createPurchaseOrder } from "@/app/actions/order";

export function NewOrderForm({ suppliers, variants, initialPR }: { suppliers: any[], variants: any[], initialPR?: any }) {
  const [lines, setLines] = useState(
    initialPR?.lines?.map((l: any) => ({
      variantId: l.variantId,
      quantity: l.quantity,
      unitPrice: 0 // To be filled by buyer
    })) || [{ variantId: "", quantity: 1, unitPrice: 0 }]
  );

  const handleAddLine = () => setLines([...lines, { variantId: "", quantity: 1, unitPrice: 0 }]);
  
  const handleRemoveLine = (index: number) => {
    const newLines = [...lines];
    newLines.splice(index, 1);
    setLines(newLines);
  };

  const handleChange = (index: number, field: string, value: string | number) => {
    const newLines = [...lines];
    (newLines[index] as any)[field] = value;
    setLines(newLines);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/operations/procurement/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">New Purchase Order</h2>
      </div>

      <form action={createPurchaseOrder} className="space-y-6">
        <input type="hidden" name="lines" value={JSON.stringify(lines)} />

        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Supplier</label>
                <select name="supplierId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Expected Delivery</label>
                <input type="date" name="expectedAt" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lines.map((line: any, index: number) => (
                <div key={index} className="flex gap-4 items-start border-b pb-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">Item (Variant)</label>
                    <select 
                      required
                      value={line.variantId}
                      onChange={(e) => handleChange(index, 'variantId', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">-- Select Item --</option>
                      {variants.map(v => (
                        <option key={v.id} value={v.id}>{v.product?.name} - {v.name} ({v.sku})</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32 space-y-2">
                    <label className="text-sm font-medium">Quantity</label>
                    <input 
                      type="number" min="0.01" step="0.01" required
                      value={line.quantity}
                      onChange={(e) => handleChange(index, 'quantity', parseFloat(e.target.value))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                    />
                  </div>
                  <div className="w-32 space-y-2">
                    <label className="text-sm font-medium">Unit Price</label>
                    <input 
                      type="number" min="0" step="0.01" required
                      value={line.unitPrice}
                      onChange={(e) => handleChange(index, 'unitPrice', parseFloat(e.target.value))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                    />
                  </div>
                  <div className="pt-8">
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveLine(index)} disabled={lines.length === 1}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href="/dashboard/operations/procurement/orders">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit">Create Purchase Order</Button>
        </div>
      </form>
    </div>
  );
}

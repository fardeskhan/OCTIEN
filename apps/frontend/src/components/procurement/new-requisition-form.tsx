"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createPurchaseRequisition } from "@/app/actions/requisition";

export function NewRequisitionForm({ variants }: { variants: any[] }) {
  const [lines, setLines] = useState([{ variantId: "", quantity: 1, estimatedCost: 0 }]);

  const handleAddLine = () => setLines([...lines, { variantId: "", quantity: 1, estimatedCost: 0 }]);
  
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
        <Link href="/dashboard/operations/procurement/requisitions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">New Purchase Requisition</h2>
      </div>

      <form action={createPurchaseRequisition} className="space-y-6">
        <input type="hidden" name="lines" value={JSON.stringify(lines)} />

        <Card>
          <CardHeader>
            <CardTitle>Requisition Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <input name="department" required placeholder="e.g. IT, Operations" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Justification</label>
              <textarea name="justification" required rows={3} placeholder="Why is this purchase necessary?" className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
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
              {lines.map((line, index) => (
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
                  <div className="w-24 space-y-2">
                    <label className="text-sm font-medium">Quantity</label>
                    <input 
                      type="number" min="0.01" step="0.01" required
                      value={line.quantity}
                      onChange={(e) => handleChange(index, 'quantity', parseFloat(e.target.value))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                    />
                  </div>
                  <div className="w-32 space-y-2">
                    <label className="text-sm font-medium">Est. Cost</label>
                    <input 
                      type="number" min="0" step="0.01" required
                      value={line.estimatedCost}
                      onChange={(e) => handleChange(index, 'estimatedCost', parseFloat(e.target.value))}
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
          <Link href="/dashboard/operations/procurement/requisitions">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit">Submit Requisition</Button>
        </div>
      </form>
    </div>
  );
}

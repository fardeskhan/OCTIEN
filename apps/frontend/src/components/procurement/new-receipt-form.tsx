// @ts-nocheck
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createGoodsReceiptRequest } from "@/app/actions/receipt";

export function NewReceiptForm({ po, warehouses }: { po: any, warehouses: any[] }) {
  // Initialize with unreceived quantities
  const initialLines = po.lines
    .filter((l: any) => l.quantity > l.receivedQty)
    .map((l: any) => ({
      poLineId: l.id,
      variantId: l.variantId,
      variantName: `${l.variant?.product?.name} (${l.variant?.name})`,
      requestedQty: l.quantity - l.receivedQty,
      maxQty: l.quantity - l.receivedQty
    }));

  const [lines, setLines] = useState(initialLines);

  const handleChange = (index: number, value: number) => {
    const newLines = [...lines];
    newLines[index].requestedQty = value;
    setLines(newLines);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/operations/procurement/orders/${po.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Request Goods Receipt</h2>
      </div>

      <form action={createGoodsReceiptRequest} className="space-y-6">
        <input type="hidden" name="poId" value={po.id} />
        {/* Filter out zero requests */}
        <input type="hidden" name="lines" value={JSON.stringify(lines.filter(l => l.requestedQty > 0))} />

        <Card>
          <CardHeader>
            <CardTitle>Destination</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-md">
              <label className="text-sm font-medium">Receiving Warehouse</label>
              <select name="warehouseId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">-- Select Warehouse --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items to Receive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase border-b">
                  <tr>
                    <th className="pb-3">Item</th>
                    <th className="pb-3 text-right">Max Pending</th>
                    <th className="pb-3 text-right">Request Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line: any, index: number) => (
                    <tr key={line.poLineId} className="border-b">
                      <td className="py-3 font-medium">{line.variantName}</td>
                      <td className="py-3 text-right text-gray-500">{line.maxQty}</td>
                      <td className="py-3">
                        <div className="flex justify-end">
                          <input 
                            type="number" min="0" max={line.maxQty} step="0.01" required
                            value={line.requestedQty}
                            onChange={(e) => handleChange(index, parseFloat(e.target.value) || 0)}
                            className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm text-right" 
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {lines.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-500">
                        This order has already been fully received.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href={`/dashboard/operations/procurement/orders/${po.id}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={lines.length === 0 || lines.every(l => l.requestedQty <= 0)}>
            Submit Request to Warehouse
          </Button>
        </div>
      </form>
    </div>
  );
}

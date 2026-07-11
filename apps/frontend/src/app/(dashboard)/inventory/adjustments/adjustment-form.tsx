"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adjustInventory } from "@/app/actions/inventory";

export interface VariantOpt { id: string; name: string; unit: string }
export interface WarehouseOpt { id: string; name: string }

const selectCls = "h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 dark:bg-input/30";

export function AdjustmentForm({ variants, warehouses }: { variants: VariantOpt[]; warehouses: WarehouseOpt[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [variantId, setVariantId] = React.useState("");
  const [warehouseId, setWarehouseId] = React.useState(warehouses[0]?.id ?? "");
  const [qty, setQty] = React.useState(0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = variants.find((x) => x.id === variantId);
    if (!v || !warehouseId || qty === 0) {
      toast.error("Pick a product, warehouse, and a non-zero quantity");
      return;
    }
    setPending(true);
    try {
      await adjustInventory(variantId, warehouseId, qty, v.unit);
      toast.success(`Stock adjusted by ${qty > 0 ? "+" : ""}${qty}`);
      setQty(0);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Adjustment failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-medium">New Adjustment</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Product</Label>
            <select value={variantId} onChange={(e) => setVariantId(e.target.value)} className={selectCls} required>
              <option value="">Select…</option>
              {variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Warehouse</Label>
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={selectCls} required>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Quantity (± units)</Label>
            <Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} placeholder="e.g. -25 or 100" />
          </div>
          <Button type="submit" disabled={pending}>{pending ? "Posting…" : "Post Adjustment"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

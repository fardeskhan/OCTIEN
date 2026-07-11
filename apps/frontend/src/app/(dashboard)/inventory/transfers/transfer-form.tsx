"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { transferInventory } from "@/app/actions/inventory";

export interface VariantOpt { id: string; name: string; unit: string }
export interface WarehouseOpt { id: string; name: string }

const selectCls = "h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 dark:bg-input/30";

export function TransferForm({ variants, warehouses }: { variants: VariantOpt[]; warehouses: WarehouseOpt[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [variantId, setVariantId] = React.useState("");
  const [sourceId, setSourceId] = React.useState(warehouses[0]?.id ?? "");
  const [targetId, setTargetId] = React.useState(warehouses[1]?.id ?? "");
  const [qty, setQty] = React.useState(0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = variants.find((x) => x.id === variantId);
    if (!v || !sourceId || !targetId || qty <= 0) {
      toast.error("Pick a product, both warehouses, and a positive quantity");
      return;
    }
    if (sourceId === targetId) {
      toast.error("Source and target must differ");
      return;
    }
    setPending(true);
    try {
      await transferInventory(variantId, sourceId, targetId, qty, v.unit);
      toast.success(`Transferred ${qty} ${v.unit}`);
      setQty(0);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base font-medium">New Transfer</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Product</Label>
            <select value={variantId} onChange={(e) => setVariantId(e.target.value)} className={selectCls} required>
              <option value="">Select…</option>
              {variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>From</Label>
            <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className={selectCls}>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className={selectCls}>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          </div>
          <Button type="submit" disabled={pending}>{pending ? "Transferring…" : "Transfer"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

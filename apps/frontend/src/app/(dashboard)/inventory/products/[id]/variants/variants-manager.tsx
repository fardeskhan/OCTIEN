"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/currency";
import { createVariant, updateVariant, deleteVariant } from "@/app/actions/product";

interface UnitOpt { id: string; name: string; symbol: string }
interface VariantRow { id: string; name: string; sku: string; price: number; cost: number; unit: string }

export function VariantsManager({ productId, units, variants }: { productId: string; units: UnitOpt[]; variants: VariantRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [edit, setEdit] = React.useState<{ name: string; sku: string; price: number; cost: number }>({ name: "", sku: "", price: 0, cost: 0 });

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("productId", productId);
    setBusy(true);
    try {
      await createVariant(fd);
      toast.success("Variant added");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add variant");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    setBusy(true);
    try {
      await updateVariant({ id, ...edit });
      toast.success("Variant updated");
      setEditing(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update variant");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await deleteVariant(id);
      toast.success("Variant removed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove variant");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader><CardTitle className="text-base font-medium">Variants ({variants.length})</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">SKU</th>
                  <th className="p-3 font-medium">Unit</th>
                  <th className="p-3 font-medium text-right">Price</th>
                  <th className="p-3 font-medium text-right">Cost</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {variants.map((v) => (
                  editing === v.id ? (
                    <tr key={v.id} className="bg-muted/20">
                      <td className="p-2"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></td>
                      <td className="p-2"><Input value={edit.sku} onChange={(e) => setEdit({ ...edit, sku: e.target.value })} /></td>
                      <td className="p-2 text-muted-foreground">{v.unit}</td>
                      <td className="p-2"><Input type="number" value={edit.price} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} className="text-right" /></td>
                      <td className="p-2"><Input type="number" value={edit.cost} onChange={(e) => setEdit({ ...edit, cost: Number(e.target.value) })} className="text-right" /></td>
                      <td className="p-2">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" disabled={busy} onClick={() => saveEdit(v.id)}><Check className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{v.name}</td>
                      <td className="p-3 font-mono text-xs">{v.sku}</td>
                      <td className="p-3 text-muted-foreground">{v.unit}</td>
                      <td className="p-3 text-right tabular-nums">{formatINR(v.price)}</td>
                      <td className="p-3 text-right tabular-nums">{formatINR(v.cost)}</td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditing(v.id); setEdit({ name: v.name, sku: v.sku, price: v.price, cost: v.cost }); }}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" disabled={busy} onClick={() => remove(v.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
                {variants.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No variants yet. Add one on the right.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader><CardTitle className="text-base font-medium">Add Variant</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={onAdd} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Variant Name *</Label>
                <Input id="name" name="name" required placeholder="e.g. 500ml Bottle" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sku">SKU (optional)</Label>
                <Input id="sku" name="sku" placeholder="Auto-generated if blank" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unitId">Unit *</Label>
                <select id="unitId" name="unitId" required className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 dark:bg-input/30">
                  <option value="">Select unit…</option>
                  {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="price">Price</Label>
                  <Input id="price" name="price" type="number" min={0} defaultValue={0} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cost">Cost</Label>
                  <Input id="cost" name="cost" type="number" min={0} defaultValue={0} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={busy}><Plus className="h-4 w-4" /> Add Variant</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createEWayBill, generateEWayBill, cancelEWayBill, editEWayBill } from "@/app/actions/eway";

export interface EWayRow {
  id: string;
  ewbNumber: string;
  invoiceCode: string;
  status: string;
  validFrom: string | null;
  validUntil: string | null;
  vehicleNumber: string | null;
  transporterName: string | null;
  createdAt: string;
}
export interface InvoiceOpt { id: string; code: string }

const STATUS_VARIANT: Record<string, "default" | "secondary" | "warning" | "destructive"> = {
  GENERATED: "default", DRAFT: "secondary", PENDING: "warning", FAILED: "destructive", CANCELLED: "destructive", EXPIRED: "destructive",
};

export function EWayBillClient({ rows, candidates }: { rows: EWayRow[]; candidates: InvoiceOpt[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [newInvoice, setNewInvoice] = React.useState("");
  const [editing, setEditing] = React.useState<string | null>(null);
  const [edit, setEdit] = React.useState<{ vehicleNumber: string; transporterName: string }>({ vehicleNumber: "", transporterName: "" });

  async function run(id: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(id);
    try { await fn(); toast.success(ok); router.refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Action failed"); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Create E-Way Bill</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <select value={newInvoice} onChange={(e) => setNewInvoice(e.target.value)} className="h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 dark:bg-input/30">
            <option value="">Select an invoice…</option>
            {candidates.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
          <Button
            size="sm"
            disabled={!newInvoice || busy === "create"}
            onClick={() => run("create", () => createEWayBill(newInvoice).then(() => setNewInvoice("")), "Draft E-Way Bill created")}
          >
            <Plus className="h-4 w-4" /> Create Draft
          </Button>
          <span className="text-xs text-muted-foreground">Then Generate to get an EWB number from the provider.</span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">EWB Number</th>
                <th className="p-3 font-medium">Invoice</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Valid</th>
                <th className="p-3 font-medium">Vehicle</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No E-Way bills yet.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs">{r.ewbNumber}</td>
                    <td className="p-3">{r.invoiceCode}</td>
                    <td className="p-3"><Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>{r.status}</Badge></td>
                    <td className="p-3 text-xs text-muted-foreground">{r.validFrom ? `${r.validFrom} → ${r.validUntil}` : "—"}</td>
                    <td className="p-3 font-mono text-xs">
                      {editing === r.id ? (
                        <Input value={edit.vehicleNumber} onChange={(e) => setEdit({ ...edit, vehicleNumber: e.target.value })} className="h-7 w-28" placeholder="Vehicle" />
                      ) : (r.vehicleNumber ?? "—")}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        {editing === r.id ? (
                          <>
                            <Button size="sm" disabled={busy === r.id} onClick={() => run(r.id, () => editEWayBill(r.id, edit).then(() => setEditing(null)), "E-Way Bill updated")}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            {(r.status === "DRAFT" || r.status === "PENDING" || r.status === "FAILED") && (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => { setEditing(r.id); setEdit({ vehicleNumber: r.vehicleNumber ?? "", transporterName: r.transporterName ?? "" }); }}>Edit</Button>
                                <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => run(r.id, () => generateEWayBill(r.id), "E-Way Bill generated")}>Generate</Button>
                              </>
                            )}
                            {r.status === "GENERATED" && (
                              <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => run(r.id, () => cancelEWayBill(r.id, "Cancelled by user"), "E-Way Bill cancelled")}>Cancel</Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

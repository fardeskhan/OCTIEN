import { requireBusinessContext } from "@/lib/server-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createSupplier } from "@/app/actions/supplier";
import { SupplierStatus, SupplierRiskLevel } from "@prisma/client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewSupplierPage() {
  await requireBusinessContext();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/operations/procurement/suppliers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Add Supplier</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createSupplier} className="space-y-4">
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name</label>
              <input 
                name="name" 
                required 
                placeholder="Supplier Organization Name"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Initial Status</label>
                <select name="status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {Object.values(SupplierStatus).map(s => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Risk Level</label>
                <select name="riskLevel" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {Object.values(SupplierRiskLevel).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Terms</label>
              <input 
                name="paymentTerms" 
                placeholder="e.g. NET30, DUE_ON_RECEIPT"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit">Create Supplier</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

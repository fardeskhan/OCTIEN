export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { getPayablesAging } from "@/lib/finance/payables-aging";
import { formatINR } from "@/lib/currency";
import { EnterprisePage, EnterprisePageHeader, EnterpriseStatusBadge, EnterpriseEmptyState } from "@/components/enterprise";

export default async function SuppliersPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("procurement.read");

  const [suppliers, aging] = await Promise.all([
    db.supplier.findMany({ where: { businessId, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, code: true, status: true } }),
    getPayablesAging(businessId),
  ]);
  const outstandingById = new Map(aging.perSupplier.map((s) => [s.supplierId, s.total]));

  return (
    <EnterprisePage>
      <EnterprisePageHeader title="Suppliers" description="Vendors and their outstanding payables." />

      {suppliers.length === 0 ? (
        <EnterpriseEmptyState title="No suppliers" description="Add suppliers to start procurement." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Outstanding AP</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 text-muted-foreground">{s.code}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                  <td className="px-4 py-3"><EnterpriseStatusBadge status={s.status} showIcon={false} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{outstandingById.get(s.id) ? formatINR(outstandingById.get(s.id) as number) : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="flex justify-end gap-3">
                      <Link href={`/procurement/suppliers/${s.id}/360`} className="font-medium text-primary hover:underline">360°</Link>
                      <Link href={`/procurement/suppliers/${s.id}/statement`} className="font-medium text-primary hover:underline">Statement</Link>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </EnterprisePage>
  );
}

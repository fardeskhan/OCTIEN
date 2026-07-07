// @ts-nocheck
import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/rbac";
import { withActiveRecords } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function InvoicesPage() {
  const { businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission(userId, tenantId, "finance.read");

  const invoices = await db.customerInvoice.findMany(
    withActiveRecords({ 
      where: { businessId },
      include: { customer: true },
      orderBy: { createdAt: "desc" }
    })
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Invoices</h1>
          <p className="text-slate-500 text-sm">Accounts Receivable</p>
        </div>
        <Link href="/dashboard/finance">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b">
            <tr>
              <th className="p-4 font-medium">Invoice Code</th>
              <th className="p-4 font-medium">Customer</th>
              <th className="p-4 font-medium">Total Amount</th>
              <th className="p-4 font-medium">Remaining</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y text-slate-700">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium">{inv.code}</td>
                <td className="p-4">{inv.customer?.name || "Unknown"}</td>
                <td className="p-4">${inv.totalAmount.toNumber().toFixed(2)}</td>
                <td className="p-4">${inv.remainingAmount.toNumber().toFixed(2)}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    inv.status === "PAID" ? "bg-green-100 text-green-700" :
                    inv.status === "PARTIALLY_PAID" ? "bg-amber-100 text-amber-700" :
                    inv.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {inv.status.replace("_", " ")}
                  </span>
                </td>
                <td className="p-4">{inv.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  No invoices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

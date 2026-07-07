// @ts-nocheck
import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/rbac";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function CashLedgerPage() {
  const { businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission(userId, tenantId, "finance.read");

  const transactions = await db.cashTransaction.findMany({ 
    where: { businessId },
    orderBy: { occurredAt: "desc" }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cash Ledger</h1>
          <p className="text-slate-500 text-sm">Cash In / Cash Out</p>
        </div>
        <Link href="/dashboard/finance">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b">
            <tr>
              <th className="p-4 font-medium">Date</th>
              <th className="p-4 font-medium">Type</th>
              <th className="p-4 font-medium">Description</th>
              <th className="p-4 font-medium">Source</th>
              <th className="p-4 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y text-slate-700">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 whitespace-nowrap">{tx.occurredAt.toLocaleString()}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    tx.type === "CASH_IN" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  }`}>
                    {tx.type.replace("_", " ")}
                  </span>
                </td>
                <td className="p-4">{tx.description || "-"}</td>
                <td className="p-4 text-slate-500">{tx.sourceType ? `${tx.sourceType}` : "-"}</td>
                <td className={`p-4 text-right font-medium ${
                  tx.type === "CASH_IN" ? "text-emerald-600" : "text-rose-600"
                }`}>
                  {tx.type === "CASH_IN" ? "+" : "-"}${tx.amount.toNumber().toFixed(2)}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No cash transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

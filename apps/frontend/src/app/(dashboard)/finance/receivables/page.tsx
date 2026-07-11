export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { formatINR } from "@/lib/currency";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent } from "@/components/ui/card";

export default async function ReceivablesPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("finance.read");

  const invoices = await db.customerInvoice.findMany({
    where: { businessId, deletedAt: null },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  const openInvoices = invoices.filter((i) => i.remainingAmount.toNumber() > 0);
  const totalAR = openInvoices.reduce((s, i) => s + i.remainingAmount.toNumber(), 0);
  const paidCount = invoices.filter((i) => i.status === "PAID").length;

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Receivables"
        description="Accounts receivable — outstanding customer invoices and collections."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Outstanding AR" value={formatINR(totalAR)} freshness="Live" />
        <KPICard title="Open Invoices" value={openInvoices.length} freshness="Live" />
        <KPICard title="Fully Paid" value={paidCount} variant="success" freshness="Live" />
        <KPICard title="Total Invoices" value={invoices.length} freshness="Live" />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-4 font-medium">Invoice</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium text-right">Total</th>
                <th className="p-4 font-medium text-right">Remaining</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">{inv.code}</td>
                  <td className="p-4">{inv.customer?.name || "Unknown"}</td>
                  <td className="p-4 text-right">{formatINR(inv.totalAmount.toNumber(), { decimals: true })}</td>
                  <td className="p-4 text-right">{formatINR(inv.remainingAmount.toNumber(), { decimals: true })}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        inv.status === "PAID"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : inv.status === "PARTIALLY_PAID"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : inv.status === "CANCELLED"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}
                    >
                      {inv.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">{inv.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No customer invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </WorkspaceLayout>
  );
}

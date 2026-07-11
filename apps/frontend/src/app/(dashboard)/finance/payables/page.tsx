export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { formatINR } from "@/lib/currency";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PayablesPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("finance.read");

  const payables = await db.payableEntry.findMany({
    where: { businessId },
    include: { allocations: true },
    orderBy: { dueDate: "asc" },
  });

  const bills = await db.supplierBill.findMany({
    where: { businessId },
    include: { supplier: true },
    orderBy: { createdAt: "desc" },
  });

  const openPayables = payables.filter((p) => p.status !== "PAID");
  const totalOutstanding = openPayables.reduce(
    (s, p) => s + (p.amount.toNumber() - p.paidAmount.toNumber()),
    0,
  );
  const now = new Date();
  const overdueAP = openPayables
    .filter((p) => p.dueDate && new Date(p.dueDate) < now)
    .reduce((s, p) => s + (p.amount.toNumber() - p.paidAmount.toNumber()), 0);

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Payables"
        description="Accounts payable — supplier bills, payable entries, and payment runs."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Outstanding AP" value={formatINR(totalOutstanding)} freshness="Live" />
        <KPICard title="Overdue AP" value={formatINR(overdueAP)} variant="warning" freshness="Live" />
        <KPICard title="Open Payables" value={openPayables.length} freshness="Live" />
        <KPICard title="Draft Bills" value={bills.filter((b) => b.status === "DRAFT").length} freshness="Live" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Payable Entries</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {payables.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No payable entries found.</div>
            ) : (
              payables.map((p) => {
                const remaining = p.amount.toNumber() - p.paidAmount.toNumber();
                return (
                  <div key={p.id} className="p-4 hover:bg-muted/30 transition-colors flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{p.sourceId}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.status === "PAID"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : p.status === "PARTIAL"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{p.sourceType}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatINR(p.amount.toNumber())}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatINR(remaining)} left</p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Supplier Bills</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {bills.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No bills found.</div>
            ) : (
              bills.map((bill) => (
                <div key={bill.id} className="p-4 hover:bg-muted/30 transition-colors flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{bill.code}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          bill.status === "DRAFT"
                            ? "bg-muted text-muted-foreground"
                            : bill.status === "APPROVED"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        }`}
                      >
                        {bill.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{bill.supplier.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatINR(bill.totalAmount.toNumber())}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </WorkspaceLayout>
  );
}

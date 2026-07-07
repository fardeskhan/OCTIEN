// @ts-nocheck
export const dynamic = 'force-dynamic';
// @ts-nocheck
import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/rbac";
import { withActiveRecords } from "@/lib/db";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function FinanceDashboardPage() {
  const { businessId, tenantId, userId } = await requireBusinessContext();
  await requirePermission(userId, tenantId, "finance.read");

  // KPIs
  const invoices = await db.customerInvoice.findMany(
    withActiveRecords({ where: { businessId } })
  );
  const bills = await db.supplierBill.findMany(
    withActiveRecords({ where: { businessId } })
  );
  const cashTx = await db.cashTransaction.findMany({
    where: { businessId }
  });

  const totalAR = invoices.reduce((sum, inv) => sum + inv.remainingAmount.toNumber(), 0);
  const totalAP = bills.reduce((sum, bill) => sum + bill.remainingAmount.toNumber(), 0);
  const totalCashIn = cashTx.filter(t => t.type === "CASH_IN").reduce((sum, t) => sum + t.amount.toNumber(), 0);
  const totalCashOut = cashTx.filter(t => t.type === "CASH_OUT").reduce((sum, t) => sum + t.amount.toNumber(), 0);
  const netCash = totalCashIn - totalCashOut;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Finance Dashboard</h1>
          <p className="text-slate-500 mt-2">CAP-FINANCE LITE</p>
        </div>
        <div className="space-x-4">
          <Link href="/dashboard/finance/invoices">
            <Button variant="outline">Invoices</Button>
          </Link>
          <Link href="/dashboard/finance/bills">
            <Button variant="outline">Bills</Button>
          </Link>
          <Link href="/dashboard/finance/cash">
            <Button variant="outline">Cash Ledger</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm border-slate-200/60 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Accounts Receivable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">${totalAR.toFixed(2)}</div>
            <p className="text-xs text-blue-500 mt-1">Total open customer invoices</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60 bg-gradient-to-br from-amber-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Accounts Payable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">${totalAP.toFixed(2)}</div>
            <p className="text-xs text-amber-500 mt-1">Total open supplier bills</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Total Cash In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">${totalCashIn.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Total Cash Out
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-600">${totalCashOut.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">Recent Outstanding Invoices</h2>
          <div className="space-y-3">
            {invoices.filter(i => i.remainingAmount.toNumber() > 0).slice(0, 5).map(inv => (
              <div key={inv.id} className="flex justify-between items-center p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                <div>
                  <div className="font-medium text-slate-900">{inv.code}</div>
                  <div className="text-sm text-slate-500">Status: {inv.status}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-blue-600">${inv.remainingAmount.toNumber().toFixed(2)}</div>
                  <div className="text-xs text-slate-400">Total: ${inv.totalAmount.toNumber().toFixed(2)}</div>
                </div>
              </div>
            ))}
            {invoices.filter(i => i.remainingAmount.toNumber() > 0).length === 0 && (
              <div className="text-sm text-slate-500 py-4 text-center">No outstanding invoices.</div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-800 border-b pb-2">Recent Outstanding Bills</h2>
          <div className="space-y-3">
            {bills.filter(b => b.remainingAmount.toNumber() > 0).slice(0, 5).map(bill => (
              <div key={bill.id} className="flex justify-between items-center p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                <div>
                  <div className="font-medium text-slate-900">{bill.code}</div>
                  <div className="text-sm text-slate-500">Status: {bill.status}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-amber-600">${bill.remainingAmount.toNumber().toFixed(2)}</div>
                  <div className="text-xs text-slate-400">Total: ${bill.totalAmount.toNumber().toFixed(2)}</div>
                </div>
              </div>
            ))}
            {bills.filter(b => b.remainingAmount.toNumber() > 0).length === 0 && (
              <div className="text-sm text-slate-500 py-4 text-center">No outstanding bills.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

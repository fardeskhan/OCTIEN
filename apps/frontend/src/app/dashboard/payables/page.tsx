// @ts-nocheck
import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/auth/context";

export default async function PayablesDashboard() {
  const { businessId } = await requireBusinessContext();

  const payables = await db.payableEntry.findMany({
    where: { businessId },
    include: {
      allocations: true
    },
    orderBy: { dueDate: "asc" }
  });

  const bills = await db.supplierBill.findMany({
    where: { businessId },
    include: {
      supplier: true
    },
    orderBy: { createdAt: "desc" }
  });

  const totalOutstanding = payables.filter(p => p.status !== "PAID").reduce((sum, p) => sum + (p.amount.toNumber() - p.paidAmount.toNumber()), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Accounts Payable</h1>
        <p className="text-slate-400 mt-2">Manage supplier bills, payable entries, and payment allocations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
          <h3 className="text-slate-400 font-medium">Total Outstanding</h3>
          <p className="text-3xl font-bold text-white mt-2">₹{totalOutstanding.toLocaleString()}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
          <h3 className="text-slate-400 font-medium">Open Payables</h3>
          <p className="text-3xl font-bold text-white mt-2">{payables.filter(p => p.status !== "PAID").length}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
          <h3 className="text-slate-400 font-medium">Draft Bills</h3>
          <p className="text-3xl font-bold text-white mt-2">{bills.filter(b => b.status === "DRAFT").length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payable Entries */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Payable Entries</h2>
          </div>
          <div className="divide-y divide-slate-800/50">
            {payables.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No payable entries found.</div>
            ) : (
              payables.map(payable => {
                const remaining = payable.amount.toNumber() - payable.paidAmount.toNumber();
                return (
                  <div key={payable.id} className="p-6 hover:bg-slate-800/30 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-white">{payable.sourceId}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${payable.status === "PAID" ? "bg-emerald-500/10 text-emerald-400" : payable.status === "PARTIAL" ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"}`}>
                            {payable.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{payable.sourceType}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">₹{payable.amount.toNumber().toLocaleString()}</p>
                        <p className="text-xs text-slate-500 mt-0.5">₹{remaining.toLocaleString()} left</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Supplier Bills */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Supplier Bills</h2>
          </div>
          <div className="divide-y divide-slate-800/50">
            {bills.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No bills found.</div>
            ) : (
              bills.map(bill => (
                <div key={bill.id} className="p-6 hover:bg-slate-800/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-white">{bill.code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bill.status === "DRAFT" ? "bg-slate-500/10 text-slate-400" : bill.status === "APPROVED" ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                          {bill.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{bill.supplier.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">₹{bill.totalAmount.toNumber().toLocaleString()}</p>
                      {bill.status === "DRAFT" && (
                        <button className="mt-2 text-xs text-blue-400 hover:text-blue-300 font-medium">
                          Approve Bill
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

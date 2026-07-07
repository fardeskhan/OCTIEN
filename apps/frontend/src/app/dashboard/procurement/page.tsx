// @ts-nocheck
import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/auth/context";

export default async function ProcurementDashboard() {
  const { businessId } = await requireBusinessContext();

  const suppliers = await db.supplier.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  const purchaseOrders = await db.purchaseOrder.findMany({
    where: { businessId },
    include: {
      supplier: true
    },
    orderBy: { createdAt: "desc" }
  });

  const grns = await db.goodsReceiptRequest.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Procurement</h1>
        <p className="text-slate-400 mt-2">Manage vendors, purchase orders, and goods receipts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
          <h3 className="text-slate-400 font-medium">Active Suppliers</h3>
          <p className="text-3xl font-bold text-white mt-2">{suppliers.length}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
          <h3 className="text-slate-400 font-medium">Open POs</h3>
          <p className="text-3xl font-bold text-white mt-2">{purchaseOrders.filter(p => p.status !== "RECEIVED").length}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
          <h3 className="text-slate-400 font-medium">Pending GRNs</h3>
          <p className="text-3xl font-bold text-white mt-2">{grns.filter(g => g.status === "REQUESTED").length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Purchase Orders */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Purchase Orders</h2>
          </div>
          <div className="divide-y divide-slate-800/50">
            {purchaseOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No purchase orders found.</div>
            ) : (
              purchaseOrders.map(po => (
                <div key={po.id} className="p-6 hover:bg-slate-800/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-white">{po.code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${po.status === "RECEIVED" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"}`}>
                          {po.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{po.supplier.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">₹{po.totalAmount.toNumber().toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Goods Receipts */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Goods Receipts</h2>
          </div>
          <div className="divide-y divide-slate-800/50">
            {grns.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No GRNs found.</div>
            ) : (
              grns.map(grn => (
                <div key={grn.id} className="p-6 hover:bg-slate-800/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-white">{grn.code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${grn.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                          {grn.status}
                        </span>
                      </div>
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

// @ts-nocheck
import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/server-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default async function ReceiptDetailsPage({ params }: { params: { id: string } }) {
  const { currentBusinessId } = await requireBusinessContext();

  const gr = await db.goodsReceiptRequest.findUnique({
    where: { id: params.id, businessId: currentBusinessId },
    include: {
      purchaseOrder: { include: { supplier: true } },
      lines: {
        include: {
          variant: { include: { product: true } }
        }
      }
    }
  });

  if (!gr) return <div>Goods Receipt Request not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/operations/procurement/receipts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Receipt {gr.code}</h2>
          <p className="text-muted-foreground">PO {gr.purchaseOrder.code} • {gr.status}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Requested Items</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase border-b">
                  <tr>
                    <th className="pb-3">Item</th>
                    <th className="pb-3 text-right">Requested</th>
                    <th className="pb-3 text-right text-green-600">Accepted</th>
                    <th className="pb-3 text-right text-red-600">Rejected</th>
                    <th className="pb-3 text-right text-gray-400">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {gr.lines.map((line, idx) => (
                    <tr key={line.id} className={idx !== gr.lines.length - 1 ? "border-b" : ""}>
                      <td className="py-3 font-medium">
                        {line.variant?.product?.name} ({line.variant?.name})
                        <br />
                        <span className="text-xs text-gray-500 font-mono">{line.variant?.sku}</span>
                      </td>
                      <td className="py-3 text-right">{line.requestedQty}</td>
                      <td className="py-3 text-right text-green-600 font-bold">{line.acceptedQty}</td>
                      <td className="py-3 text-right text-red-600 font-bold">{line.rejectedQty}</td>
                      <td className="py-3 text-right text-gray-500">{line.varianceQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-500">Supplier</h4>
                <p className="mt-1">{gr.purchaseOrder.supplier.name}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-500">Requested At</h4>
                <p className="mt-1">{new Date(gr.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-500">Warehouse ID</h4>
                <p className="mt-1 font-mono text-xs">{gr.warehouseId}</p>
              </div>
              
              {gr.status === "REQUESTED" && (
                <div className="pt-4 border-t border-dashed mt-4">
                  <div className="bg-yellow-50 p-3 rounded mb-4">
                    <p className="text-xs text-yellow-800">
                      This request has been sent to the Warehouse. It is waiting for CAP-INVENTORY to process the physical receipt. 
                    </p>
                  </div>
                  <form action={async () => {
                    "use server";
                    const { processGoodsReceiptRequest } = await import("@/app/actions/inventory");
                    const acceptedLines = gr.lines.map(l => ({
                      id: l.id,
                      acceptedQty: l.requestedQty, // Simulating 100% acceptance
                      rejectedQty: 0
                    }));
                    await processGoodsReceiptRequest(gr.id, acceptedLines);
                  }}>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Simulate Inventory Processing
                    </Button>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

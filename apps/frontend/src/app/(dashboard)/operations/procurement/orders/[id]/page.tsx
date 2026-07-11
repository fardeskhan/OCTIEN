import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/server-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updatePurchaseOrderStatus } from "@/app/actions/order";
import Link from "next/link";
import { ArrowLeft, Check, Send, Truck } from "lucide-react";

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { currentBusinessId } = await requireBusinessContext();

  const po = await db.purchaseOrder.findUnique({
    where: { id, businessId: currentBusinessId },
    include: {
      supplier: true,
      currency: true,
      lines: {
        include: {
          variant: { include: { product: true } }
        }
      }
    }
  });

  if (!po) return <div>Purchase Order not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/operations/procurement/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Purchase Order {po.code}</h2>
            <p className="text-muted-foreground">{po.status} • {po.supplier.name}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {po.status === "DRAFT" && (
            <form action={async () => {
              "use server";
              await updatePurchaseOrderStatus(po.id, "APPROVED");
            }}>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Check className="mr-2 h-4 w-4" /> Approve PO
              </Button>
            </form>
          )}

          {po.status === "APPROVED" && (
            <form action={async () => {
              "use server";
              await updatePurchaseOrderStatus(po.id, "ORDERED");
            }}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Send className="mr-2 h-4 w-4" /> Submit to Supplier
              </Button>
            </form>
          )}

          {(po.status === "ORDERED" || po.status === "PARTIALLY_RECEIVED") && (
            <Link href={`/dashboard/operations/procurement/receipts/new?poId=${po.id}`}>
              <Button variant="secondary">
                <Truck className="mr-2 h-4 w-4" /> Request Goods Receipt
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase border-b">
                  <tr>
                    <th className="pb-3">Item</th>
                    <th className="pb-3 text-right">Qty</th>
                    <th className="pb-3 text-right">Unit Price</th>
                    <th className="pb-3 text-right">Total Price</th>
                    <th className="pb-3 text-right text-gray-400">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {po.lines.map((line, idx) => (
                    <tr key={line.id} className={idx !== po.lines.length - 1 ? "border-b" : ""}>
                      <td className="py-3 font-medium">
                        {line.variant?.product?.name} ({line.variant?.name})
                        <br />
                        <span className="text-xs text-gray-500 font-mono">{line.variant?.sku}</span>
                      </td>
                      <td className="py-3 text-right">{line.quantity}</td>
                      <td className="py-3 text-right">{po.currency.symbol}{line.unitPrice.toFixed(2)}</td>
                      <td className="py-3 text-right">{po.currency.symbol}{line.totalPrice.toFixed(2)}</td>
                      <td className="py-3 text-right text-gray-500">{line.receivedQty}</td>
                    </tr>
                  ))}
                  <tr className="border-t font-bold">
                    <td className="py-3" colSpan={3}>Total Amount</td>
                    <td className="py-3 text-right">{po.currency.symbol}{po.totalAmount.toFixed(2)}</td>
                    <td className="py-3 text-right"></td>
                  </tr>
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
                <h4 className="font-semibold text-gray-500">Expected Delivery</h4>
                <p className="mt-1">{po.expectedAt ? new Date(po.expectedAt).toLocaleDateString() : "Not specified"}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-500">Ordered At</h4>
                <p className="mt-1">{po.orderedAt ? new Date(po.orderedAt).toLocaleString() : "-"}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-500">Approved By</h4>
                <p className="mt-1">{po.approvedBy ? "User " + po.approvedBy : "-"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

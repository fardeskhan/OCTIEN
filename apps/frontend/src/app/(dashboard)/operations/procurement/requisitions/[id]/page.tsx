import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/server-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateRequisitionStatus } from "@/app/actions/requisition";
import Link from "next/link";
import { ArrowLeft, Check, X } from "lucide-react";

export default async function RequisitionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { currentBusinessId } = await requireBusinessContext();

  const pr = await db.purchaseRequisition.findUnique({
    where: { id, businessId: currentBusinessId },
    include: {
      lines: {
        include: {
          variant: { include: { product: true } }
        }
      }
    }
  });

  if (!pr) return <div>Requisition not found</div>;

  const estimatedTotal = pr.lines.reduce((sum, line) => sum + (line.estimatedCost || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/operations/procurement/requisitions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Requisition {pr.code}</h2>
            <p className="text-muted-foreground">{pr.status} • {pr.department || "No Department"}</p>
          </div>
        </div>
        
        {pr.status === "DRAFT" && (
          <form action={async () => {
            "use server";
            await updateRequisitionStatus(pr.id, "SUBMITTED");
          }}>
            <Button>Submit for Approval</Button>
          </form>
        )}

        {pr.status === "SUBMITTED" && (
          <div className="flex gap-2">
            <form action={async () => {
              "use server";
              await updateRequisitionStatus(pr.id, "REJECTED");
            }}>
              <Button variant="destructive">
                <X className="mr-2 h-4 w-4" /> Reject
              </Button>
            </form>
            <form action={async () => {
              "use server";
              await updateRequisitionStatus(pr.id, "APPROVED");
            }}>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Check className="mr-2 h-4 w-4" /> Approve
              </Button>
            </form>
          </div>
        )}
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
                    <th className="pb-3 text-right">Quantity</th>
                    <th className="pb-3 text-right">Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {pr.lines.map((line, idx) => (
                    <tr key={line.id} className={idx !== pr.lines.length - 1 ? "border-b" : ""}>
                      <td className="py-3 font-medium">
                        {line.variant?.product?.name} ({line.variant?.name})
                        <br />
                        <span className="text-xs text-gray-500 font-mono">{line.variant?.sku}</span>
                      </td>
                      <td className="py-3 text-right">{line.quantity}</td>
                      <td className="py-3 text-right">${line.estimatedCost?.toFixed(2) || "0.00"}</td>
                    </tr>
                  ))}
                  <tr className="border-t font-bold">
                    <td className="py-3" colSpan={2}>Total Estimated Cost</td>
                    <td className="py-3 text-right">${estimatedTotal.toFixed(2)}</td>
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
                <h4 className="font-semibold text-gray-500">Justification</h4>
                <p className="mt-1">{pr.justification}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-500">Created At</h4>
                <p className="mt-1">{new Date(pr.createdAt).toLocaleDateString()}</p>
              </div>
              {pr.status === "APPROVED" && (
                <div className="pt-4 border-t">
                  <Link href={`/dashboard/operations/procurement/orders/new?prId=${pr.id}`}>
                    <Button className="w-full">Create Purchase Order</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

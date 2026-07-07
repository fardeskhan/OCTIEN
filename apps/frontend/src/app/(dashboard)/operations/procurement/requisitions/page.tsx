// @ts-nocheck
import Link from "next/link";
import { db } from "@/lib/db";
import { requireBusinessContext } from "@/lib/server-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, FileText } from "lucide-react";

export default async function RequisitionsPage() {
  const { currentBusinessId } = await requireBusinessContext();

  const requisitions = await db.purchaseRequisition.findMany({
    where: { businessId: currentBusinessId },
    include: {
      lines: true
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Purchase Requisitions</h2>
        <Link href="/dashboard/operations/procurement/requisitions/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Requisition
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requisitions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requisitions.map(pr => {
              const estimatedTotal = pr.lines.reduce((sum, line) => sum + (line.estimatedCost || 0), 0);
              
              let statusColor = "bg-gray-100 text-gray-800";
              if (pr.status === "SUBMITTED") statusColor = "bg-blue-100 text-blue-800";
              if (pr.status === "APPROVED") statusColor = "bg-green-100 text-green-800";
              if (pr.status === "REJECTED") statusColor = "bg-red-100 text-red-800";

              return (
                <div key={pr.id} className="flex justify-between items-center p-4 border rounded shadow-sm hover:border-gray-300">
                  <div className="flex gap-4">
                    <div className="p-2 bg-gray-50 rounded hidden sm:block">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/operations/procurement/requisitions/${pr.id}`}>
                          <h3 className="font-semibold text-lg hover:underline">{pr.code}</h3>
                        </Link>
                        <span className={`text-xs px-2 py-1 rounded font-medium ${statusColor}`}>
                          {pr.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Dept: {pr.department || "N/A"} • Items: {pr.lines.length}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">
                      ${estimatedTotal.toFixed(2)}
                    </p>
                    <Link href={`/dashboard/operations/procurement/requisitions/${pr.id}`}>
                      <Button variant="outline" size="sm" className="mt-2">View Details</Button>
                    </Link>
                  </div>
                </div>
              );
            })}
            {requisitions.length === 0 && (
              <div className="text-center p-12 text-gray-500 border rounded">
                No purchase requisitions found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

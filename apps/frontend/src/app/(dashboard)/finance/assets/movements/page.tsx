export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { Card, CardContent } from "@/components/ui/card";

export default async function AssetMovementsPage() {
  const { currentBusinessId: businessId } = await requireBusinessContext();
  await requirePermission("finance.read");

  const assignments = await db.assetAssignment.findMany({
    where: { asset: { businessId } },
    include: { asset: { select: { assetCode: true, name: true } } },
    orderBy: { assignedDate: "desc" },
    take: 100,
  });

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Asset Movements" description="Assignments, transfers, and returns of fixed assets." />
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">Asset</th>
                <th className="p-3 font-medium">Assigned To</th>
                <th className="p-3 font-medium">Assigned</th>
                <th className="p-3 font-medium">Returned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assignments.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No asset movements recorded yet.</td></tr>
              ) : (
                assignments.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{m.asset.assetCode} · {m.asset.name}</td>
                    <td className="p-3">{m.assignedTo}</td>
                    <td className="p-3 text-muted-foreground">{m.assignedDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td className="p-3 text-muted-foreground">{m.returnedDate ? m.returnedDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </WorkspaceLayout>
  );
}

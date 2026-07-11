export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PendingApprovalsPage() {
  const { tenantId } = await requireBusinessContext();
  await requirePermission("governance.read");

  const requests = await db.approvalRequest.findMany({
    where: { tenantId },
    include: { actions: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const pending = requests.filter((r) => r.status === "PENDING");

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Approvals"
        description={`${pending.length} pending approval request${pending.length === 1 ? "" : "s"} in this tenant.`}
      />
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">Requested</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Reference</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Last Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No approval requests yet. Documents routed for approval (POs, journals, invoices) appear here.</td></tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 whitespace-nowrap text-muted-foreground">{r.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td className="p-3 font-mono text-xs">{r.sourceType.replace(/_/g, " ")}</td>
                    <td className="p-3 font-mono text-xs">{r.sourceId.slice(0, 12)}…</td>
                    <td className="p-3"><Badge variant={r.status === "PENDING" ? "warning" : r.status === "APPROVED" ? "default" : "destructive"}>{r.status}</Badge></td>
                    <td className="p-3 text-muted-foreground">{r.actions[0] ? `${r.actions[0].actionType} · ${r.actions[0].createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : "—"}</td>
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

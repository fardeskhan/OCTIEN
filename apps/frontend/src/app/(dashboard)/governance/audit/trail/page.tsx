export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ACTION_VARIANT: Record<string, "default" | "secondary" | "warning" | "destructive"> = {
  create: "default", update: "secondary", payment: "default", generate: "default",
  void: "warning", cancel: "warning", delete: "destructive", status_change: "secondary", seed_load: "secondary",
};

export default async function AuditTrailPage() {
  const { tenantId } = await requireBusinessContext();
  await requirePermission("governance.read");

  const entries = await db.auditLog.findMany({
    where: { tenantId },
    orderBy: { occurredAt: "desc" },
    take: 150,
  });

  const actorIds = [...new Set(entries.map((e) => e.actorId))];
  const businessIds = [...new Set(entries.map((e) => e.businessId).filter((x): x is string => !!x))];
  const [actors, businesses] = await Promise.all([
    db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, email: true } }),
    db.business.findMany({ where: { id: { in: businessIds } }, select: { id: true, name: true } }),
  ]);
  const actorName = new Map(actors.map((a) => [a.id, a.name || a.email]));
  const bizName = new Map(businesses.map((b) => [b.id, b.name]));

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Audit Trail"
        description="Every recorded action in this tenant — newest first. Write actions across the ERP append here automatically."
      />

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">When</th>
                <th className="p-3 font-medium">Actor</th>
                <th className="p-3 font-medium">Action</th>
                <th className="p-3 font-medium">Resource</th>
                <th className="p-3 font-medium">Business</th>
                <th className="p-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No audit entries yet. Actions like creating invoices, businesses, or E-Way bills appear here automatically.</td></tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 whitespace-nowrap text-muted-foreground">{e.occurredAt.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="p-3">{actorName.get(e.actorId) ?? e.actorId.slice(0, 8)}</td>
                    <td className="p-3"><Badge variant={ACTION_VARIANT[e.action] ?? "secondary"}>{e.action.replace(/_/g, " ")}</Badge></td>
                    <td className="p-3 font-mono text-xs">{e.resource}</td>
                    <td className="p-3 text-muted-foreground">{e.businessId ? bizName.get(e.businessId) ?? "—" : "Tenant"}</td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[280px] truncate">
                      {e.metadata ? JSON.stringify(e.metadata) : "—"}
                    </td>
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

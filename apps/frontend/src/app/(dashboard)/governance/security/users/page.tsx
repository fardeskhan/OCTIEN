export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default async function UsersPage() {
  const { tenantId } = await requireBusinessContext();
  await requirePermission("governance.read");

  const users = await db.user.findMany({
    where: { tenantId },
    include: {
      memberships: { include: { business: { select: { name: true } }, role: { select: { name: true } } } },
      sessions: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Users" description="Everyone in this tenant, their business access, and roles." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KPICard title="Users" value={users.length} freshness="Live" />
        <KPICard title="With Business Access" value={users.filter((u) => u.memberships.length > 0).length} freshness="Live" />
        <KPICard title="Verified Email" value={users.filter((u) => u.emailVerified).length} freshness="Live" />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">User</th>
                <th className="p-3 font-medium">Business Access</th>
                <th className="p-3 font-medium">Role(s)</th>
                <th className="p-3 font-medium">Last Session</th>
                <th className="p-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => {
                const initials = u.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                const roles = [...new Set(u.memberships.map((m) => m.role.name))];
                return (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarFallback>{initials}</AvatarFallback></Avatar>
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {u.memberships.length === 0 ? (
                          <span className="text-xs text-muted-foreground">No access</span>
                        ) : (
                          u.memberships.map((m) => <Badge key={m.id} variant="outline">{m.business.name}</Badge>)
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {roles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{u.sessions[0] ? fmt(u.sessions[0].createdAt) : "—"}</td>
                    <td className="p-3 text-muted-foreground">{fmt(u.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </WorkspaceLayout>
  );
}

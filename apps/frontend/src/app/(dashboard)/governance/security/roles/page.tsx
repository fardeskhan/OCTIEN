export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function RolesPage() {
  const { tenantId } = await requireBusinessContext();
  await requirePermission("governance.read");

  const roles = await db.role.findMany({
    where: { tenantId },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { memberships: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Roles" description="Roles in this tenant with their granted permissions and members." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {roles.map((role) => {
          const byResource = new Map<string, string[]>();
          for (const rp of role.permissions) {
            const list = byResource.get(rp.permission.resource) ?? [];
            list.push(rp.permission.action);
            byResource.set(rp.permission.resource, list);
          }
          return (
            <Card key={role.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base font-medium">
                  <span>{role.name}{role.isSystem && <Badge variant="outline" className="ml-2">System</Badge>}</span>
                  <span className="text-sm font-normal text-muted-foreground">{role._count.memberships} member{role._count.memberships === 1 ? "" : "s"} · {role.permissions.length} permissions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {role.description && <p className="mb-3 text-sm text-muted-foreground">{role.description}</p>}
                {byResource.size === 0 ? (
                  <p className="text-sm text-muted-foreground">No permissions granted.</p>
                ) : (
                  <div className="space-y-2">
                    {[...byResource.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([resource, actions]) => (
                      <div key={resource} className="flex flex-wrap items-center gap-1.5 text-sm">
                        <span className="w-40 shrink-0 font-mono text-xs text-muted-foreground">{resource}</span>
                        {actions.sort().map((a) => <Badge key={a} variant="secondary">{a}</Badge>)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </WorkspaceLayout>
  );
}

export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PermissionsPage() {
  const { tenantId } = await requireBusinessContext();
  await requirePermission("governance.read");

  const [permissions, roles] = await Promise.all([
    db.permission.findMany({ include: { roles: { include: { role: { select: { tenantId: true, name: true } } } } }, orderBy: [{ resource: "asc" }, { action: "asc" }] }),
    db.role.findMany({ where: { tenantId }, select: { name: true } }),
  ]);

  const byResource = new Map<string, typeof permissions>();
  for (const p of permissions) {
    const list = byResource.get(p.resource) ?? [];
    list.push(p);
    byResource.set(p.resource, list);
  }

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Permission Catalog"
        description={`${permissions.length} permissions across ${byResource.size} resources · ${roles.length} roles in this tenant.`}
      />

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-medium">Resource</th>
                <th className="p-3 font-medium">Action</th>
                <th className="p-3 font-medium">Granted To (this tenant)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...byResource.entries()].map(([resource, perms]) =>
                perms.map((p, i) => {
                  const grantedRoles = [...new Set(p.roles.filter((rp) => rp.role.tenantId === tenantId).map((rp) => rp.role.name))];
                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-xs">{i === 0 ? resource : ""}</td>
                      <td className="p-3"><Badge variant="outline">{p.action}</Badge></td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {grantedRoles.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Not granted</span>
                          ) : (
                            grantedRoles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </WorkspaceLayout>
  );
}

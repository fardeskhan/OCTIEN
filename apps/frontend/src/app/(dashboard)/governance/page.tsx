export const dynamic = "force-dynamic";

import Link from "next/link";
import { Users, Shield, KeyRound, ScrollText, CheckSquare, FileText } from "lucide-react";
import { db } from "@/lib/db";
import { requireBusinessContext, requirePermission } from "@/lib/server-auth";
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent } from "@/components/ui/card";

const SECTIONS = [
  { title: "Users", href: "/governance/security/users", icon: Users, desc: "Tenant users & business access" },
  { title: "Roles", href: "/governance/security/roles", icon: Shield, desc: "Roles & granted permissions" },
  { title: "Permissions", href: "/governance/security/permissions", icon: KeyRound, desc: "Permission catalog by resource" },
  { title: "Audit Trail", href: "/governance/audit/trail", icon: ScrollText, desc: "Who did what, when" },
  { title: "Approvals", href: "/governance/approvals/pending", icon: CheckSquare, desc: "Pending approval requests" },
  { title: "E-Way Compliance", href: "/governance/compliance/ewb", icon: FileText, desc: "E-Way bill compliance status" },
];

export default async function GovernancePage() {
  const { tenantId, currentBusinessId } = await requireBusinessContext();
  await requirePermission("governance.read");

  const [userCount, roleCount, permissionCount, auditCount, pendingApprovals, ewbTotal, ewbGenerated] = await Promise.all([
    db.user.count({ where: { tenantId } }),
    db.role.count({ where: { tenantId } }),
    db.permission.count(),
    db.auditLog.count({ where: { tenantId } }),
    db.approvalRequest.count({ where: { tenantId, status: "PENDING" } }),
    db.eWayBill.count({ where: { businessId: currentBusinessId } }),
    db.eWayBill.count({ where: { businessId: currentBusinessId, status: "GENERATED" } }),
  ]);

  const compliancePct = ewbTotal ? Math.round((ewbGenerated / ewbTotal) * 100) : 100;

  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Governance" description="Security, access control, audit, approvals, and compliance." />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard title="Users" value={userCount} freshness="Live" />
        <KPICard title="Roles" value={roleCount} freshness="Live" />
        <KPICard title="Permissions" value={permissionCount} freshness="Live" />
        <KPICard title="Audit Entries" value={auditCount} freshness="Live" />
        <KPICard title="Pending Approvals" value={pendingApprovals} variant={pendingApprovals > 0 ? "warning" : "success"} freshness="Live" />
        <KPICard title="E-Way Compliance" value={`${compliancePct}%`} variant={compliancePct >= 80 ? "success" : "warning"} freshness="Live" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {SECTIONS.map((s) => (
          <Link key={s.title} href={s.href}>
            <Card className="h-full hover:shadow-md hover:border-primary/40 transition-all">
              <CardContent className="p-4 flex flex-col gap-2">
                <s.icon className="h-5 w-5 text-muted-foreground" />
                <div className="text-sm font-medium">{s.title}</div>
                <div className="text-xs text-muted-foreground">{s.desc}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </WorkspaceLayout>
  );
}

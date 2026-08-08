export const dynamic = 'force-dynamic';
import { redirect } from "next/navigation";
import { EnterpriseShell, EnterpriseTopbar } from "@/components/enterprise/shell";
import { PoweredByAeterex } from "@/components/branding/PoweredByAeterex";
import { getSession, requireBusinessContext } from "@/lib/server-auth";
import { db } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  if (!session) {
    redirect("/login");
  }

  // Fetch all businesses the user has membership to (role included for the account menu display).
  const memberships = await db.membership.findMany({
    where: { userId: session.user.id },
    include: { business: true, role: true },
  });

  const businesses = memberships.map((m) => m.business);

  // If no businesses, they shouldn't be here or need to be assigned one.
  if (businesses.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>You do not have access to any businesses.</p>
      </div>
    );
  }

  let currentBusinessId = "";
  let permissions: string[] = [];

  try {
    const context = await requireBusinessContext();
    currentBusinessId = context.currentBusinessId;
    permissions = context.permissions;
  } catch (error) {
    // If they have no valid business context cookie, default to the first business they have access to
    // In a real app, we might redirect them to a /select-business page, but this is a good default.
    currentBusinessId = businesses[0].id;
    // We do NOT set the cookie here; the client should call switchBusiness if needed, 
    // but we can pass permissions if we load them manually for the default.
    const defaultMembership = await db.membership.findFirst({
      where: { userId: session.user.id, businessId: currentBusinessId },
      include: { role: { include: { permissions: { include: { permission: true } } } } }
    });
    
    if (defaultMembership) {
       permissions = defaultMembership.role.permissions.map(
         (rp) => `${rp.permission.resource}.${rp.permission.action}`
       );
    }
  }

  // Display-only labels for the account menu (current workspace + role).
  const currentMembership = memberships.find((m) => m.businessId === currentBusinessId);
  const workspaceName = businesses.find((b) => b.id === currentBusinessId)?.name;
  const roleName = currentMembership?.role?.name;

  return (
    <>
      <EnterpriseShell
        permissions={permissions}
        businesses={businesses}
        currentBusinessId={currentBusinessId}
        topbar={<EnterpriseTopbar user={session.user} workspace={workspaceName} role={roleName} />}
      >
        {children}
      </EnterpriseShell>
      {/* Injected once for every authenticated page; hidden on auth pages and in print. */}
      <PoweredByAeterex />
    </>
  );
}

import { requireAnyRole } from "@/lib/server-auth";

export default async function GovernanceLayout({ children }: { children: React.ReactNode }) {
  await requireAnyRole(["Auditor"]);
  return <>{children}</>;
}

import { requireAnyRole } from "@/lib/server-auth";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  await requireAnyRole(["Finance", "Auditor"]);
  return <>{children}</>;
}

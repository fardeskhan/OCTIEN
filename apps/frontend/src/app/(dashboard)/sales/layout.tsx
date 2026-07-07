import { requireAnyRole } from "@/lib/server-auth";

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  await requireAnyRole(["Sales"]);
  return <>{children}</>;
}

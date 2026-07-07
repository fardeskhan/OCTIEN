import { requireAnyRole } from "@/lib/server-auth";

export default async function InventoryLayout({ children }: { children: React.ReactNode }) {
  await requireAnyRole(["Operations", "Warehouse"]);
  return <>{children}</>;
}

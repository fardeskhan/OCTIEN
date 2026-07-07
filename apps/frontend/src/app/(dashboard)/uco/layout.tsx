import { requireAnyRole } from "@/lib/server-auth";

export default async function UcoLayout({ children }: { children: React.ReactNode }) {
  await requireAnyRole(["Driver", "Operations"]);
  return <>{children}</>;
}

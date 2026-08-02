"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Banknote,
  Droplet,
  GlassWater,
  Box,
  Shield,
  Truck,
  Building2
} from "lucide-react";

type NavigationItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
};

const navigation: NavigationItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Inventory", href: "/inventory", icon: Package, permission: "inventory.read" },
  { title: "Procurement", href: "/operations/procurement", icon: ShoppingCart, permission: "procurement.read" },
  { title: "Logistics", href: "/operations/logistics", icon: Truck, permission: "logistics.read" },
  { title: "Reports", href: "/reports", icon: Banknote, permission: "reporting.read" },
  { title: "Sales", href: "/sales", icon: Users, permission: "sales.read" },
  { title: "Finance", href: "/finance", icon: Banknote, permission: "finance.read" },
  { title: "Governance", href: "/governance", icon: Shield, permission: "governance.read" },
  { title: "Businesses", href: "/business", icon: Building2 },
  { title: "UCO Collections", href: "/uco", icon: Droplet, permission: "uco.read" },
  { title: "Salam Cola", href: "/salam-cola", icon: GlassWater, permission: "salam.read" },
  { title: "Casa De Lumas", href: "/lumas", icon: Box, permission: "lumas.read" },
];

export function Sidebar({ userPermissions }: { userPermissions: string[] }) {
  const pathname = usePathname() ?? "";

  const filteredNavigation = navigation.filter((item) => {
    if (!item.permission) return true;
    // For SUPER_ADMIN, userPermissions might include a wildcard or just pass everything.
    // For now, assume userPermissions is a list of exact matches, plus handling for super admin is done upstream
    // or by passing a flag. We'll simply check if it's in the array.
    return userPermissions.includes(item.permission) || userPermissions.includes("*");
  });

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card print:hidden">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <BrandLogo variant="full" size={26} />
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {filteredNavigation.map((item) => {
          const isActive = pathname.startsWith(item.href) && (item.href !== "/" || pathname === "/");
          return (
            <Link
              key={item.title}
              href={item.href}
              className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-[18px] w-[18px] flex-shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"
                )}
                aria-hidden="true"
              />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

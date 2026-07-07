// @ts-nocheck
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Banknote,
  Droplet,
  GlassWater,
  Box,
  Shield
} from "lucide-react";

type NavigationItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
};

const navigation: NavigationItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Inventory", href: "/inventory", icon: Package, permission: "inventory.read" },
  { title: "Procurement", href: "/operations/procurement", icon: ShoppingCart, permission: "procurement.read" },
  { title: "Reports", href: "/reports", icon: Banknote, permission: "reporting.read" },
  { title: "Sales", href: "/sales", icon: Users, permission: "sales.read" },
  { title: "Finance", href: "/finance", icon: Banknote, permission: "finance.read" },
  { title: "Governance", href: "/governance", icon: Shield, permission: "governance.read" },
  { title: "UCO Collections", href: "/uco", icon: Droplet, permission: "uco.read" },
  { title: "Salam Cola", href: "/salam-cola", icon: GlassWater, permission: "salam.read" },
  { title: "Casa De Lumas", href: "/lumas", icon: Box, permission: "lumas.read" },
];

export function Sidebar({ userPermissions }: { userPermissions: string[] }) {
  const pathname = usePathname();

  const filteredNavigation = navigation.filter((item) => {
    if (!item.permission) return true;
    // For SUPER_ADMIN, userPermissions might include a wildcard or just pass everything.
    // For now, assume userPermissions is a list of exact matches, plus handling for super admin is done upstream
    // or by passing a flag. We'll simply check if it's in the array.
    return userPermissions.includes(item.permission) || userPermissions.includes("*");
  });

  return (
    <div className="flex h-full w-64 flex-col border-r bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800">
      <div className="flex h-14 items-center border-b px-4 border-gray-200 dark:border-zinc-800">
        <h1 className="font-bold text-lg tracking-tight">COSMY ERP</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive = pathname.startsWith(item.href) && (item.href !== "/dashboard" || pathname === "/dashboard");
          return (
            <Link
              key={item.title}
              href={item.href}
              className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-white"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-zinc-800/50 dark:hover:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-400 group-hover:text-gray-900 dark:text-gray-500 dark:group-hover:text-white"
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

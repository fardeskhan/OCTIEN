"use client";

import { cn } from "@/lib/utils";
import { isActive, type NavGroup } from "@/lib/navigation";
import { SidebarNavItem } from "./sidebar-nav-item";

interface Props {
  groups: NavGroup[];
  pathname: string;
  collapsed: boolean;
  favorites: string[];
  onToggleFavorite: (href: string) => void;
}

/** Grouped navigation — rendered entirely from the (already permission-filtered) nav model. */
export function EnterpriseSidebarNavigation({ groups, pathname, collapsed, favorites, onToggleFavorite }: Props) {
  return (
    <nav aria-label="Primary" className="space-y-4">
      {groups.map((group, gi) => (
        <div key={group.label} className="space-y-0.5">
          {collapsed ? (
            gi > 0 && <div className="mx-2 my-2 border-t border-sidebar-border" aria-hidden="true" />
          ) : (
            <div className="px-3 pb-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </div>
          )}
          {group.items.map((item) => (
            <SidebarNavItem
              key={item.label}
              item={item}
              collapsed={collapsed}
              active={item.href ? isActive(item, pathname) : false}
              favorite={item.href ? favorites.includes(item.href) : false}
              onToggleFavorite={onToggleFavorite}
              showStar
            />
          ))}
        </div>
      ))}
    </nav>
  );
}

/** Small section wrapper for Favorites / Recent with a quiet header (hidden in rail mode). */
export function SidebarSection({ title, collapsed, children }: { title: string; collapsed: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-0.5")}>
      {!collapsed && (
        <div className="px-3 pb-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      )}
      {children}
    </div>
  );
}

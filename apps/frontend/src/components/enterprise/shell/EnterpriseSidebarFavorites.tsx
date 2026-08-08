"use client";

import { getItemByHref, isActive } from "@/lib/navigation";
import { SidebarNavItem } from "./sidebar-nav-item";
import { SidebarSection } from "./EnterpriseSidebarNavigation";

interface Props {
  favorites: string[];
  pathname: string;
  collapsed: boolean;
  onToggleFavorite: (href: string) => void;
}

/** Pinned favorite routes (resolved from the nav model). Renders nothing when empty. */
export function EnterpriseSidebarFavorites({ favorites, pathname, collapsed, onToggleFavorite }: Props) {
  const items = favorites.map(getItemByHref).filter((i): i is NonNullable<typeof i> => i != null);
  if (items.length === 0) return null;

  return (
    <SidebarSection title="Favorites" collapsed={collapsed}>
      {items.map((item) => (
        <SidebarNavItem
          key={item.href}
          item={item}
          collapsed={collapsed}
          active={item.href ? isActive(item, pathname) : false}
          favorite
          onToggleFavorite={onToggleFavorite}
          showStar
        />
      ))}
    </SidebarSection>
  );
}

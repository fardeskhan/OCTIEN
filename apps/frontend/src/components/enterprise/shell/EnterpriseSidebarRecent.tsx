"use client";

import { describeRoute } from "@/lib/navigation";
import { SidebarNavItem } from "./sidebar-nav-item";
import { SidebarSection } from "./EnterpriseSidebarNavigation";

interface Props {
  recent: string[];
  pathname: string;
  collapsed: boolean;
}

/** Recently visited routes (resolved to icon+label via the nav model). Renders nothing when empty. */
export function EnterpriseSidebarRecent({ recent, pathname, collapsed }: Props) {
  const items = recent.filter((href) => href !== pathname).slice(0, 5);
  if (items.length === 0) return null;

  return (
    <SidebarSection title="Recent" collapsed={collapsed}>
      {items.map((href) => (
        <SidebarNavItem key={href} item={describeRoute(href)} collapsed={collapsed} active={false} />
      ))}
    </SidebarSection>
  );
}

"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { NavItem } from "@/lib/navigation";

interface SidebarNavItemProps {
  item: NavItem;
  /** Rail (collapsed) mode → icon only + floating tooltip. */
  collapsed: boolean;
  active: boolean;
  favorite?: boolean;
  onToggleFavorite?: (href: string) => void;
  /** Show the favorite star affordance (hidden for `soon`/no-href items). */
  showStar?: boolean;
}

/**
 * The single sidebar row renderer — reused by navigation groups, favorites, and recent. Knows only a
 * `NavItem` (from `lib/navigation`); no module or route knowledge. Handles active state, badges, the
 * favorite star, `soon` (disabled) items, and rail-mode floating tooltips.
 */
export function SidebarNavItem({ item, collapsed, active, favorite, onToggleFavorite, showStar }: SidebarNavItemProps) {
  const isSoon = (item.status ?? "live") === "soon" || !item.href;
  const Icon = item.icon;
  const badge = item.badge ?? (isSoon ? "Soon" : undefined);

  const row = (
    <div
      className={cn(
        "group/navitem relative flex h-9 items-center rounded-md text-sm font-medium transition-colors",
        collapsed ? "justify-center px-0" : "gap-3 px-3",
        active
          ? "bg-primary-subtle text-primary"
          : isSoon
            ? "text-muted-foreground/50"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      {/* Active accent bar */}
      {active && !collapsed && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary" aria-hidden="true" />
      )}
      <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-current")} aria-hidden="true" />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {badge !== undefined && (
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-2xs font-medium",
                isSoon ? "bg-muted text-muted-foreground/70" : "bg-primary/10 text-primary",
              )}
            >
              {badge}
            </span>
          )}
          {showStar && !isSoon && item.href && onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite(item.href!);
              }}
              aria-label={favorite ? `Unpin ${item.label}` : `Pin ${item.label}`}
              aria-pressed={favorite}
              className={cn(
                "shrink-0 rounded p-0.5 text-muted-foreground transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                favorite ? "opacity-100 text-warning" : "opacity-0 group-hover/navitem:opacity-100",
              )}
            >
              <Star className={cn("size-3.5", favorite && "fill-current")} aria-hidden="true" />
            </button>
          )}
        </>
      )}
    </div>
  );

  // Disabled (soon) — not a link.
  if (isSoon) {
    const content = (
      <div aria-disabled="true" className="cursor-default select-none">
        {row}
      </div>
    );
    return collapsed ? withTooltip(content, item.label + " (Soon)") : content;
  }

  const link = (
    <Link href={item.href!} aria-current={active ? "page" : undefined} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
      {row}
    </Link>
  );

  return collapsed ? withTooltip(link, item.label) : link;
}

function withTooltip(trigger: React.ReactElement, label: string) {
  return (
    <Tooltip>
      <TooltipTrigger render={trigger} />
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

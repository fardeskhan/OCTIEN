"use client";

import Link from "next/link";
import { Settings, LifeBuoy, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  collapsed: boolean;
}

const footerLinks = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help", href: "/help", icon: LifeBuoy },
] as const;

/** Sidebar footer — settings, help, and a (mock) storage indicator. */
export function EnterpriseSidebarFooter({ collapsed }: Props) {
  return (
    <div className="border-t border-sidebar-border p-2 space-y-0.5">
      {footerLinks.map((l) => {
        const row = (
          <Link
            href={l.href}
            className={cn(
              "flex h-9 items-center rounded-md text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              collapsed ? "justify-center px-0" : "gap-3 px-3",
            )}
          >
            <l.icon className="size-4 shrink-0 text-current" aria-hidden="true" />
            {!collapsed && <span className="truncate">{l.label}</span>}
          </Link>
        );
        return collapsed ? (
          <Tooltip key={l.href}>
            <TooltipTrigger render={row} />
            <TooltipContent side="right" sideOffset={8}>{l.label}</TooltipContent>
          </Tooltip>
        ) : (
          <div key={l.href}>{row}</div>
        );
      })}
      {!collapsed && (
        <div className="mt-1 px-3 pt-2">
          <div className="flex items-center gap-1.5 text-2xs text-muted-foreground">
            <HardDrive className="size-3" aria-hidden="true" /> Storage
            <span className="ml-auto tabular-nums">32%</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Storage used" aria-valuenow={32} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-primary" style={{ width: "32%" }} />
          </div>
        </div>
      )}
    </div>
  );
}

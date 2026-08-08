"use client";

import { PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/branding/BrandLogo";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

/** Sidebar header — OCTIEN logo + collapse/expand control. */
export function EnterpriseSidebarHeader({ collapsed, onToggle }: Props) {
  return (
    <div className={cn("flex h-14 items-center border-b border-sidebar-border", collapsed ? "justify-center px-0" : "justify-between px-3")}>
      {collapsed ? (
        <BrandLogo variant="mark" size={26} />
      ) : (
        <BrandLogo variant="full" size={24} />
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar ([)" : "Collapse sidebar ([)"}
        className={cn(
          "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          collapsed && "absolute -right-3 top-4 z-10 border border-sidebar-border bg-sidebar shadow-sm",
        )}
      >
        {collapsed ? <PanelLeft className="size-4" aria-hidden="true" /> : <PanelLeftClose className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

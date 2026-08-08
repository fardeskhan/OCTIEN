"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getVisibleNavigation } from "@/lib/navigation";
import { useFavorites } from "./hooks/useFavorites";
import { useRecent } from "./hooks/useRecent";
import { useNavigationSearch } from "./hooks/useNavigationSearch";
import { useSidebar } from "./hooks/useSidebar";
import { EnterpriseSidebarHeader } from "./EnterpriseSidebarHeader";
import { EnterpriseWorkspaceSwitcher, type ShellBusiness } from "./EnterpriseWorkspaceSwitcher";
import { EnterpriseSidebarNavigation } from "./EnterpriseSidebarNavigation";
import { EnterpriseSidebarFavorites } from "./EnterpriseSidebarFavorites";
import { EnterpriseSidebarRecent } from "./EnterpriseSidebarRecent";
import { EnterpriseSidebarFooter } from "./EnterpriseSidebarFooter";
import { EnterpriseScrollArea } from "./EnterpriseScrollArea";
import { SidebarNavItem } from "./sidebar-nav-item";
import { isActive } from "@/lib/navigation";

interface Props {
  permissions: string[];
  businesses: ShellBusiness[];
  currentBusinessId?: string;
  /** When true, always render expanded (used inside the mobile drawer). */
  forceExpanded?: boolean;
  /** Extra classes on the root `<aside>` (e.g. breakpoint gating or drawer overrides). */
  className?: string;
}

/**
 * OCTIEN application sidebar. Knows nothing about modules — every item comes from
 * `getVisibleNavigation(permissions)`. Expanded 280px ↔ rail 72px (animated), keyboard `[` to
 * collapse, favorites/recent/nav-search, permission-aware, active indicators, badges, tooltips.
 */
export function EnterpriseSidebar({ permissions, businesses, currentBusinessId, forceExpanded, className }: Props) {
  const pathname = usePathname() ?? "";
  const { collapsed: rawCollapsed, toggle } = useSidebar();
  const collapsed = forceExpanded ? false : rawCollapsed;
  const { favorites, toggle: toggleFavorite } = useFavorites();
  const recent = useRecent();
  const { query, setQuery, results } = useNavigationSearch(permissions);

  const groups = useMemo(() => getVisibleNavigation(permissions), [permissions]);

  // Keyboard: `[` toggles collapse (ignore when typing in a field).
  useEffect(() => {
    if (forceExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "[") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, forceExpanded]);

  const searching = results !== null;

  return (
    <TooltipProvider delay={200}>
      <aside
        data-collapsed={collapsed}
        className={cn(
          "relative flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out print:hidden",
          collapsed ? "w-[72px]" : "w-[280px]",
          className,
        )}
      >
        <EnterpriseSidebarHeader collapsed={collapsed} onToggle={toggle} />

        {/* Workspace switcher */}
        <div className={cn("border-b border-sidebar-border", collapsed ? "flex justify-center py-2" : "p-2")}>
          <EnterpriseWorkspaceSwitcher businesses={businesses} currentBusinessId={currentBusinessId} collapsed={collapsed} />
        </div>

        {/* Navigation search (expanded only) */}
        {!collapsed && (
          <div className="border-b border-sidebar-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search navigation…"
                aria-label="Search navigation"
                className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Scrollable body — enterprise scrollbar + top/bottom scroll fade */}
        <EnterpriseScrollArea className="overflow-x-hidden px-2 py-3" fadeColor="var(--sidebar)">
          {searching ? (
            <div className="space-y-0.5">
              {results!.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">No matches for “{query}”.</p>
              ) : (
                results!.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    collapsed={false}
                    active={item.href ? isActive(item, pathname) : false}
                    favorite={item.href ? favorites.includes(item.href) : false}
                    onToggleFavorite={toggleFavorite}
                    showStar
                  />
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <EnterpriseSidebarFavorites favorites={favorites} pathname={pathname} collapsed={collapsed} onToggleFavorite={toggleFavorite} />
              <EnterpriseSidebarNavigation groups={groups} pathname={pathname} collapsed={collapsed} favorites={favorites} onToggleFavorite={toggleFavorite} />
              <EnterpriseSidebarRecent recent={recent} pathname={pathname} collapsed={collapsed} />
            </div>
          )}
        </EnterpriseScrollArea>

        <EnterpriseSidebarFooter collapsed={collapsed} />
      </aside>
    </TooltipProvider>
  );
}

"use client";

import { ChevronDown, ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useNotifications, type NotificationView } from "./EnterpriseNotificationProvider";
import { NOTIFICATION_TYPES, type NotificationType } from "./lib/notifications";

const VIEWS: { id: NotificationView; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "critical", label: "Critical" },
];

/**
 * Filter controls: a segmented view switch (All / Unread / Critical, each with a live count) plus
 * Type and Business dropdown facets. All state lives in the platform; this only reads and sets it.
 */
export function EnterpriseNotificationFilters() {
  const {
    filter, setView, setType, setBusiness,
    all, unreadCount, criticalCount, businesses,
  } = useNotifications();

  const counts: Record<NotificationView, number> = {
    all: all.length,
    unread: unreadCount,
    critical: criticalCount,
  };

  const typesPresent = NOTIFICATION_TYPES.filter((t) => all.some((n) => n.type === t));
  const facetActive = filter.type !== null || filter.business !== null;

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
      {/* Segmented view switch */}
      <div role="tablist" aria-label="Filter notifications" className="flex items-center gap-0.5 rounded-lg bg-muted/70 p-1">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={filter.view === v.id}
            onClick={() => setView(v.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              filter.view === v.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v.label}
            {counts[v.id] > 0 && (
              <span
                className={cn(
                  "min-w-[1.1rem] rounded-full px-1 text-center text-2xs font-semibold tabular-nums",
                  v.id === "critical"
                    ? "bg-destructive/15 text-destructive"
                    : filter.view === v.id ? "bg-primary/15 text-primary" : "bg-foreground/10 text-muted-foreground",
                )}
              >
                {counts[v.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Facets */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            facetActive && "border-primary/40 text-primary",
          )}
          aria-label="More filters"
        >
          <ListFilter className="size-3.5" aria-hidden="true" />
          <ChevronDown className="size-3" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Type</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setType(null)} className={cn("text-xs", filter.type === null && "font-semibold text-primary")}>
            All types
          </DropdownMenuItem>
          {typesPresent.map((t) => (
            <DropdownMenuItem
              key={t}
              onClick={() => setType(t as NotificationType)}
              className={cn("text-xs", filter.type === t && "font-semibold text-primary")}
            >
              {t}
            </DropdownMenuItem>
          ))}

          {businesses.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Business</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setBusiness(null)} className={cn("text-xs", filter.business === null && "font-semibold text-primary")}>
                All businesses
              </DropdownMenuItem>
              {businesses.map((b) => (
                <DropdownMenuItem
                  key={b}
                  onClick={() => setBusiness(b)}
                  className={cn("text-xs", filter.business === b && "font-semibold text-primary")}
                >
                  {b}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

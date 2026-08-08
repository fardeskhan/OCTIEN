"use client";

import { useEffect } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNotifications } from "./EnterpriseNotificationProvider";
import { EnterpriseNotificationCenter } from "./EnterpriseNotificationCenter";

/**
 * Header notification trigger — the bell that opens the notification center. Shows an unread count
 * badge with a subtle pulse (reduced-motion aware), a tooltip with the keyboard shortcut, and toggles
 * the center via ⌘⇧N / Ctrl+Shift+N. Open state is owned by the platform so the shortcut and the panel
 * stay in sync. Replaces the header placeholder.
 */
export function EnterpriseNotificationBadge() {
  const { unreadCount, criticalCount, open, setOpen } = useNotifications();
  const hasUnread = unreadCount > 0;
  const label = hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications";

  // Keyboard shortcut: ⌘⇧N / Ctrl+Shift+N
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const trigger = (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "relative inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150",
        "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        open && "bg-muted text-foreground",
      )}
    >
      <Bell className="size-[1.125rem]" aria-hidden="true" />
      {hasUnread && (
        <span className="absolute right-1.5 top-1.5 flex size-2.5">
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping",
              criticalCount > 0 ? "bg-destructive" : "bg-primary",
            )}
          />
          <span
            className={cn(
              "relative inline-flex size-2.5 rounded-full ring-2 ring-card",
              criticalCount > 0 ? "bg-destructive" : "bg-primary",
            )}
          />
        </span>
      )}
      {/* Count pill for larger counts, positioned to not overlap the pulse dot */}
      {unreadCount > 1 && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute -right-1 -top-1 min-w-[1.05rem] rounded-full px-1 text-center text-2xs font-bold leading-4 ring-2 ring-card",
            criticalCount > 0 ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground",
          )}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger render={<PopoverTrigger render={trigger} />} />
        <TooltipContent side="bottom" sideOffset={6}>
          Notifications
          <kbd data-slot="kbd" className="ml-1 rounded bg-background/20 px-1 text-2xs">⌘⇧N</kbd>
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-auto p-0"
        aria-label="Notification center"
      >
        <EnterpriseNotificationCenter />
      </PopoverContent>
    </Popover>
  );
}

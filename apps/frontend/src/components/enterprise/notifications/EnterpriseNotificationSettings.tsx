"use client";

import { useRouter } from "next/navigation";
import { Settings2, RefreshCw, CheckCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "./EnterpriseNotificationProvider";

/**
 * Overflow menu for the notification center header. Mark-all-read and Refresh are wired to the
 * platform today; per-channel preferences link out to Settings (the delivery-preferences surface is
 * a future increment, but the entry point exists so the architecture is complete).
 */
export function EnterpriseNotificationSettings() {
  const router = useRouter();
  const { markAllRead, refresh, setOpen, unreadCount } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Notification options"
      >
        <Settings2 className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Options</DropdownMenuLabel>
        <DropdownMenuItem onClick={markAllRead} disabled={unreadCount === 0} className="gap-2 text-xs">
          <CheckCheck className="size-4 text-muted-foreground" aria-hidden="true" />
          Mark all as read
        </DropdownMenuItem>
        <DropdownMenuItem onClick={refresh} className="gap-2 text-xs">
          <RefreshCw className="size-4 text-muted-foreground" aria-hidden="true" />
          Refresh
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => { setOpen(false); router.push("/settings"); }}
          className="gap-2 text-xs"
        >
          <Settings2 className="size-4 text-muted-foreground" aria-hidden="true" />
          Notification preferences
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

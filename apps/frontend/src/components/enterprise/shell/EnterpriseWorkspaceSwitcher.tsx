"use client";

import { useTransition } from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { switchBusiness } from "@/app/actions/business";
import { toast } from "sonner";

export type ShellBusiness = { id: string; name: string; slug: string };

interface Props {
  businesses: ShellBusiness[];
  currentBusinessId?: string;
  collapsed: boolean;
}

/** Workspace (business) identity + switcher — lives in the sidebar header. Reuses `switchBusiness`. */
export function EnterpriseWorkspaceSwitcher({ businesses, currentBusinessId, collapsed }: Props) {
  const [isPending, startTransition] = useTransition();
  const current = businesses.find((b) => b.id === currentBusinessId) ?? businesses[0];

  const select = (id: string) => {
    if (id === currentBusinessId) return;
    startTransition(async () => {
      try {
        await switchBusiness(id);
        toast.success("Workspace switched");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to switch workspace");
      }
    });
  };

  const initials = (current?.name ?? "?").slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Switch workspace"
        disabled={isPending}
        className={cn(
          "flex items-center rounded-md text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:opacity-60",
          collapsed ? "size-9 justify-center" : "w-full gap-2.5 px-2 py-1.5 hover:bg-sidebar-accent",
        )}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-2xs font-semibold text-primary-foreground">
          {initials}
        </span>
        {!collapsed && (
          <>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-sidebar-foreground">{current?.name ?? "Select workspace"}</span>
              <span className="truncate text-2xs text-muted-foreground">Workspace</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
          <Building2 className="size-3.5" aria-hidden="true" /> Workspaces
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {businesses.map((b) => (
          <DropdownMenuItem key={b.id} onClick={() => select(b.id)} className="gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-2xs font-semibold">
              {b.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="flex-1 truncate">{b.name}</span>
            {b.id === currentBusinessId && <Check className="size-4 text-primary" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

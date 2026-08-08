"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { quickActionGroups, useEnterpriseSearch } from "@/components/enterprise/search";

/**
 * Enterprise Quick Actions — the header ＋New menu. Config-driven (`quickActions`) and
 * permission-aware (reads `permissions` from the search platform). Grouped by module, keyboard
 * navigable. The same actions are searchable in the command palette (Create group). Renders nothing
 * if the user can create nothing.
 */
export function EnterpriseQuickActions() {
  const router = useRouter();
  const { permissions } = useEnterpriseSearch();
  const groups = quickActionGroups(permissions);
  if (groups.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-8 gap-1.5 rounded-lg px-2.5 shadow-xs" aria-label="Create new">
          <Plus className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">New</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {groups.map((s, i) => (
          <div key={s.group}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{s.group}</DropdownMenuLabel>
            {s.actions.map((a) => (
              <DropdownMenuItem key={a.id} onClick={() => router.push(a.href)} className="gap-2">
                <a.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                {a.title}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

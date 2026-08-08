"use client";

import { useRouter } from "next/navigation";
import {
  UserRound, Settings2, Bell, KeyRound, Command, LifeBuoy, BookOpen, Rocket, MessageSquareText, LogOut, Building2, ChevronsUpDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EnterpriseThemeSwitcher } from "./EnterpriseThemeSwitcher";

interface Props {
  user: { name: string; email: string; image?: string | null };
  /** Current workspace (business) name — shown in the account header. */
  workspace?: string;
  /** Current role label for the active workspace. */
  role?: string;
}

/**
 * Enterprise User Menu — a full account center (not a bare dropdown). Grouped sections: an identity
 * header (avatar + online status + workspace + role), Account, Appearance (theme), and Help &
 * resources, with Sign out pinned at the foot. Navigation-only; all styling from shell tokens, and it
 * inherits the frozen enterprise scrollbar if the viewport is short. Items without a destination yet
 * are shown as clearly-forthcoming ("Soon") rather than dead links.
 */
export function EnterpriseUserMenu({ user, workspace, role }: Props) {
  const router = useRouter();
  const initials = user.name?.trim()?.charAt(0)?.toUpperCase() || "U";

  const signOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-8 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:ring-2 data-[popup-open]:ring-ring"
        aria-label="Account menu"
      >
        <span className="relative">
          <Avatar className="size-8">
            <AvatarImage src={user.image || undefined} alt="" />
            <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-success ring-2 ring-card" aria-hidden="true" />
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-72 p-0">
        {/* Identity header */}
        <div className="p-3">
          <div className="flex items-center gap-3">
            <span className="relative shrink-0">
              <Avatar className="size-10">
                <AvatarImage src={user.image || undefined} alt="" />
                <AvatarFallback className="text-sm font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-success ring-2 ring-popover" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              <p className="mt-0.5 flex items-center gap-1 text-2xs font-medium text-success">
                <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                Online
              </p>
            </div>
          </div>

          {(workspace || role) && (
            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="mt-2.5 flex w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Building2 className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-foreground">{workspace ?? "Workspace"}</span>
                {role && <span className="block truncate text-2xs text-muted-foreground">{role}</span>}
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Account */}
        <div className="p-1">
          <SectionLabel>Account</SectionLabel>
          <Row icon={UserRound} label="Profile" onClick={() => router.push("/settings")} />
          <Row icon={Settings2} label="Preferences" onClick={() => router.push("/settings")} />
          <Row icon={Bell} label="Notification settings" onClick={() => router.push("/settings")} />
          <Row icon={KeyRound} label="API keys" soon />
        </div>

        <DropdownMenuSeparator />

        {/* Appearance */}
        <div className="p-1">
          <SectionLabel>Appearance</SectionLabel>
          <div className="px-2 pb-1.5 pt-0.5">
            <EnterpriseThemeSwitcher />
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Help & resources */}
        <div className="p-1">
          <SectionLabel>Help &amp; resources</SectionLabel>
          <Row icon={Command} label="Keyboard shortcuts" hint="⌘K" soon />
          <Row icon={LifeBuoy} label="Help center" onClick={() => router.push("/help")} />
          <Row icon={BookOpen} label="Documentation" onClick={() => router.push("/help")} />
          <Row icon={Rocket} label="Release notes" soon />
          <Row icon={MessageSquareText} label="Feedback" soon />
        </div>

        <DropdownMenuSeparator />

        {/* Sign out */}
        <div className="p-1">
          <DropdownMenuItem
            onClick={signOut}
            className="gap-2.5 rounded-md px-2 py-2 text-sm text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenuLabel className="px-2 pb-1 pt-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </DropdownMenuLabel>
  );
}

function Row({
  icon: Icon,
  label,
  hint,
  soon,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  soon?: boolean;
  onClick?: () => void;
}) {
  return (
    <DropdownMenuItem
      onClick={soon ? undefined : onClick}
      disabled={soon}
      className={cn("gap-2.5 rounded-md px-2 py-2 text-sm", soon && "opacity-100 data-[disabled]:opacity-100")}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="flex-1 truncate text-foreground">{label}</span>
      {hint && !soon && (
        <kbd className="shrink-0 rounded-md border border-border/70 bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground">{hint}</kbd>
      )}
      {soon && (
        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide text-muted-foreground/70">
          Soon
        </span>
      )}
    </DropdownMenuItem>
  );
}

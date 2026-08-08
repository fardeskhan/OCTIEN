import { EnterpriseBreadcrumb } from "./EnterpriseBreadcrumb";
import { EnterpriseQuickActions } from "./EnterpriseQuickActions";
import { EnterpriseMobileNavTrigger } from "./EnterpriseMobileNavTrigger";
import { EnterpriseSearchBar } from "@/components/enterprise/search";
import { EnterpriseNotificationBadge } from "@/components/enterprise/notifications";
import { EnterpriseAILauncher } from "@/components/enterprise/ai";
import { EnterpriseUserMenu } from "./EnterpriseUserMenu";
import { EnterpriseThemeSwitcher } from "./EnterpriseThemeSwitcher";

type User = { name: string; email: string; image?: string | null };

interface Props {
  user: User;
  /** Current workspace (business) name for the account menu. */
  workspace?: string;
  /** Current role label for the account menu. */
  role?: string;
}

/**
 * OCTIEN application header. Server component that composes the breadcrumb trail (left) with the
 * action cluster (right). Reuses the existing theme + user controls to keep feature parity while the
 * header is built up increment-by-increment (search, command palette, quick actions, and the
 * notification center are added as their own verified pieces). Business/workspace identity lives in
 * the sidebar header, so it is intentionally absent here.
 */
export function EnterpriseTopbar({ user, workspace, role }: Props) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-3 md:px-4 print:hidden">
      {/* Left — hamburger (mobile) + breadcrumb; takes the free space so the cluster stays flush right. */}
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <EnterpriseMobileNavTrigger />
        <EnterpriseBreadcrumb />
      </div>

      {/* Right — one aligned action cluster: search + create, then a divider, then system/account. */}
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="hidden md:block">
          <EnterpriseSearchBar />
        </div>
        <EnterpriseQuickActions />
        <div className="mx-0.5 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
        <EnterpriseAILauncher />
        <EnterpriseNotificationBadge />
        {/* Theme lives in the user menu on small screens; the segmented control shows from md up. */}
        <EnterpriseThemeSwitcher compact className="hidden md:inline-grid" />
        <EnterpriseUserMenu user={user} workspace={workspace} role={role} />
      </div>
    </header>
  );
}

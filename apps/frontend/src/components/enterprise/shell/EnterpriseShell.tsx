"use client";

import { EnterpriseSidebar } from "./EnterpriseSidebar";
import { EnterpriseMobileSidebar } from "./EnterpriseMobileSidebar";
import { ShellChromeProvider } from "./EnterpriseShellChrome";
import type { ShellBusiness } from "./EnterpriseWorkspaceSwitcher";
import { useTrackRecent } from "./hooks/useRecent";
import { EnterpriseSearchProvider, EnterpriseCommandPalette, EnterpriseGlobalSearch } from "@/components/enterprise/search";
import { EnterpriseNotificationProvider } from "@/components/enterprise/notifications";
import { EnterpriseAIProvider, EnterpriseAIPanel } from "@/components/enterprise/ai";

interface Props {
  permissions: string[];
  businesses: ShellBusiness[];
  currentBusinessId?: string;
  /** Server-rendered topbar node (kept a server component; passed through). */
  topbar: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The OCTIEN application shell — composition root. Places the sidebar + topbar + scrollable main.
 * The layout only composes this; no shell markup lives in `layout.tsx`. `topbar` and `children` are
 * server-rendered nodes passed through (only the sidebar chrome is client).
 */
export function EnterpriseShell({ permissions, businesses, currentBusinessId, topbar, children }: Props) {
  useTrackRecent();

  return (
    <EnterpriseSearchProvider permissions={permissions} businesses={businesses} currentBusinessId={currentBusinessId}>
      <EnterpriseNotificationProvider>
        <EnterpriseAIProvider>
          <ShellChromeProvider>
            <div className="flex h-screen overflow-hidden bg-background">
              {/* Docked sidebar — desktop (lg+) only. */}
              <EnterpriseSidebar
                permissions={permissions}
                businesses={businesses}
                currentBusinessId={currentBusinessId}
                className="hidden lg:flex"
              />
              {/* Off-canvas navigation drawer — tablet/mobile (below lg). */}
              <EnterpriseMobileSidebar permissions={permissions} businesses={businesses} currentBusinessId={currentBusinessId} />
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                {topbar}
                <main className="scrollbar-enterprise flex-1 overflow-y-auto bg-muted/30">
                  <div className="mx-auto w-full max-w-[1800px] px-4 py-6 md:px-6">{children}</div>
                </main>
              </div>
              {/* Docked on the right at lg+, overlay/sheet below lg. */}
              <EnterpriseAIPanel />
            </div>
            <EnterpriseCommandPalette />
            <EnterpriseGlobalSearch />
          </ShellChromeProvider>
        </EnterpriseAIProvider>
      </EnterpriseNotificationProvider>
    </EnterpriseSearchProvider>
  );
}

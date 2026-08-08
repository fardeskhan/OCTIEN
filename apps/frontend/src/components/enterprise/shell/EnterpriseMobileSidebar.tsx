"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { EnterpriseSidebar } from "./EnterpriseSidebar";
import type { ShellBusiness } from "./EnterpriseWorkspaceSwitcher";
import { useShellChrome } from "./EnterpriseShellChrome";
import { useFocusTrap } from "./hooks/useFocusTrap";

interface Props {
  permissions: string[];
  businesses: ShellBusiness[];
  currentBusinessId?: string;
}

/**
 * Off-canvas navigation drawer for tablet/mobile (below `lg`). Reuses the same `EnterpriseSidebar`
 * (forced expanded) so the mobile nav is never a divergent implementation. Backdrop + Escape close
 * it, and it auto-closes on route change so tapping a link dismisses it. Never rendered at `lg`+.
 */
export function EnterpriseMobileSidebar({ permissions, businesses, currentBusinessId }: Props) {
  const { mobileNavOpen, setMobileNavOpen } = useShellChrome();
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Trap focus inside the drawer while open; restore focus to the hamburger on close.
  useFocusTrap(mobileNavOpen, drawerRef);

  // Auto-close when the route changes (tapping a nav link dismisses the drawer).
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  // Escape closes.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileNavOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen, setMobileNavOpen]);

  if (!mobileNavOpen) return null;

  return (
    <div className="lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
      <div
        className="fixed inset-0 z-40 bg-foreground/25 backdrop-blur-sm animate-overlay-fade"
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />
      <div ref={drawerRef} className="animate-drawer-left fixed inset-y-0 left-0 z-50 w-[284px] max-w-[85vw] shadow-xl">
        <EnterpriseSidebar
          permissions={permissions}
          businesses={businesses}
          currentBusinessId={currentBusinessId}
          forceExpanded
          className="h-full w-full border-r-0"
        />
      </div>
    </div>
  );
}

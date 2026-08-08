"use client";

import { Menu } from "lucide-react";
import { useShellChrome } from "./EnterpriseShellChrome";

/**
 * Hamburger that opens the mobile navigation drawer. Visible only below `lg` (the docked sidebar
 * takes over at `lg`+). Matches the 32px header control system.
 */
export function EnterpriseMobileNavTrigger() {
  const { toggleMobileNav } = useShellChrome();
  return (
    <button
      type="button"
      onClick={toggleMobileNav}
      aria-label="Open navigation menu"
      className="-ml-1 inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
    >
      <Menu className="size-[1.125rem]" aria-hidden="true" />
    </button>
  );
}

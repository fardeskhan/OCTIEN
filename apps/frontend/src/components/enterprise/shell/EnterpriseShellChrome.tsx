"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Shell chrome state that is shared between the header (hamburger trigger) and the body (mobile
 * navigation drawer) — the only piece of ephemeral, non-persisted shell UI state that two separate
 * subtrees need. Kept tiny and dedicated so it doesn't grow into a catch-all.
 */
interface ShellChromeValue {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
}

const Ctx = createContext<ShellChromeValue | null>(null);

export function ShellChromeProvider({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const toggleMobileNav = useCallback(() => setMobileNavOpen((v) => !v), []);
  const value = useMemo(() => ({ mobileNavOpen, setMobileNavOpen, toggleMobileNav }), [mobileNavOpen, toggleMobileNav]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShellChrome(): ShellChromeValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShellChrome must be used within <ShellChromeProvider>");
  return ctx;
}

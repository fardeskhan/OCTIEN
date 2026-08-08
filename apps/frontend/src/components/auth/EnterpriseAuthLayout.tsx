"use client";

import { ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { EnterpriseThemeSwitcher } from "@/components/enterprise/shell";
import { branding } from "@/lib/branding";
import { EnterpriseAuthBackground } from "./EnterpriseAuthBackground";

/**
 * EnterpriseAuthLayout — the full-viewport frame for every unauthenticated OCTIEN screen (login,
 * register). It composes the animated atmosphere, a restrained brand header (OCTIEN lockup + the
 * shared theme switcher — NOT the authenticated topbar), the centered auth panel slot, and a minimal
 * footer. Uses shell tokens + the single BrandLogo + the single EnterpriseThemeSwitcher — no duplicate
 * brand or theme implementations.
 */
export function EnterpriseAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col text-foreground">
      <EnterpriseAuthBackground />

      {/* Header — brand left, theme right. Restrained. */}
      <header className="flex items-start justify-between gap-4 px-4 py-5 sm:px-8 sm:py-6">
        <div className="min-w-0">
          <BrandLogo variant="full" size={30} />
          <p className="mt-1 truncate pl-[calc(30px+0.5rem)] text-2xs text-muted-foreground">
            Enterprise Business Operating System
          </p>
        </div>
        <EnterpriseThemeSwitcher compact />
      </header>

      {/* Centered auth panel */}
      <main className="flex flex-1 items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-[26rem]">{children}</div>
      </main>

      {/* Footer — copyright + a calm security signal. No invented links. */}
      <footer className="flex flex-col items-center justify-between gap-2 px-4 py-5 text-2xs text-muted-foreground sm:flex-row sm:px-8">
        <span>{branding.copyright}</span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
          Encrypted &amp; secure
        </span>
      </footer>
    </div>
  );
}

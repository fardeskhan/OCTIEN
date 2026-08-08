"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

/**
 * Segmented theme control (System / Light / Dark) — the ONE OCTIEN theme switcher, reused everywhere
 * (header, user menu, future mobile). Never fork this into per-surface variants; use the `compact`
 * prop for density instead. Hydration-safe (no active state until mounted, avoiding SSR mismatch).
 * Switching is instant + flicker-free (next-themes `disableTransitionOnChange`). Tokens only.
 *
 * @param compact icon-only segments (header); default shows icon + label (menus/settings).
 */
export function EnterpriseThemeSwitcher({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // next-themes mounted guard — theme is unknown during SSR; reveal the active pill after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const active = mounted ? theme ?? "system" : undefined;

  return (
    <div role="radiogroup" aria-label="Theme" className={cn("inline-grid grid-cols-3 gap-0.5 rounded-lg bg-muted/70 p-0.5", className)}>
      {OPTIONS.map((o) => {
        const selected = active === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={o.label}
            title={compact ? o.label : undefined}
            onClick={() => setTheme(o.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              compact ? "size-7" : "px-2 py-1.5",
              selected ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <o.icon className="size-3.5" aria-hidden="true" />
            {!compact && o.label}
          </button>
        );
      })}
    </div>
  );
}

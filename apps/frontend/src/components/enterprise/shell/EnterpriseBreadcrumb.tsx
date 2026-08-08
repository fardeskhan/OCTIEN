"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBreadcrumbs, type Crumb } from "@/lib/navigation";

interface Props {
  /**
   * Optional override — pages with a named entity as the final crumb pass it here (or via
   * `EnterprisePageHeader`), e.g. ["Sales", "Orders", "SO-2026-00127"]. Strings become crumbs;
   * the last is the current page (unlinked). When omitted, breadcrumbs derive from the route + nav model.
   */
  override?: (string | Crumb)[];
  className?: string;
}

function toCrumb(c: string | Crumb): Crumb {
  return typeof c === "string" ? { label: c } : c;
}

/**
 * Topbar breadcrumbs. Route-derived from the single nav model (`getBreadcrumbs`), with an override
 * seam for dynamic entity names. Responsive: on small screens it collapses to the last two crumbs.
 */
export function EnterpriseBreadcrumb({ override, className }: Props) {
  const pathname = usePathname() ?? "/";
  const crumbs: Crumb[] = override && override.length ? override.map(toCrumb) : getBreadcrumbs(pathname);

  if (crumbs.length <= 1) {
    return (
      <nav aria-label="Breadcrumb" className={cn("flex items-center", className)}>
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Home className="size-4 text-muted-foreground" aria-hidden="true" />
          {crumbs[0]?.label ?? "Home"}
        </span>
      </nav>
    );
  }

  const last = crumbs.length - 1;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex min-w-0 items-center", className)}>
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((c, i) => {
          const isLast = i === last;
          // On mobile, only show the last two crumbs (hide earlier ones).
          const mobileHidden = i < last - 1;
          return (
            <li
              key={`${c.label}-${i}`}
              className={cn("flex min-w-0 items-center gap-1", mobileHidden && "hidden md:flex")}
            >
              {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
              {i === 0 && <Home className="mr-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
              {isLast || !c.href ? (
                <span
                  className={cn("truncate", isLast ? "font-medium text-foreground" : "text-muted-foreground")}
                  aria-current={isLast ? "page" : undefined}
                >
                  {c.label}
                </span>
              ) : (
                <Link
                  href={c.href}
                  className="truncate text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

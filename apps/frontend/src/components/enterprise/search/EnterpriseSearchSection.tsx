"use client";

import { Command } from "cmdk";

/** A titled group of search results (styled cmdk group). Reusable across search surfaces. */
export function EnterpriseSearchSection({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={
        <span className="flex items-center justify-between">
          <span>{title}</span>
          {count != null && <span className="tabular-nums text-muted-foreground/50">{count}</span>}
        </span>
      }
      className="mb-2 last:mb-0 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
    >
      {children}
    </Command.Group>
  );
}

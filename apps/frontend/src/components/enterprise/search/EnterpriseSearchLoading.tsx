"use client";

/** Skeleton loading state for global search (async sources in flight). */
export function EnterpriseSearchLoading() {
  return (
    <div className="space-y-1 p-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Searching…</span>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-md px-2.5 py-2">
          <div className="size-8 shrink-0 animate-pulse rounded-md bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-2 w-1/2 animate-pulse rounded bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

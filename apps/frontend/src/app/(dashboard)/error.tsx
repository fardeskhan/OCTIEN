"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Segment-level error boundary. Any error thrown while rendering a dashboard section is caught here
 * and shown as a friendly, recoverable screen instead of a raw server-crash page.
 */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const noBusiness = error.message?.includes("NO_BUSINESS_ACCESS") || error.message?.toLowerCase().includes("business");

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold">{noBusiness ? "Select a business to continue" : "Something went wrong"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {noBusiness
            ? "This section needs an active business. Pick one from the switcher, or manage your businesses below."
            : "We hit an unexpected issue loading this section. You can retry, or head back to your dashboard."}
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button onClick={reset} variant="outline">Try again</Button>
          <Link href="/business" className={buttonVariants()}>Manage Businesses</Link>
          <Link href="/" className={buttonVariants({ variant: "ghost" })}>Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

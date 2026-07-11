"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setBusinessStatus } from "@/app/actions/business";

export function BusinessStatusControl({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function apply(next: "ACTIVE" | "ARCHIVED" | "SUSPENDED") {
    setPending(true);
    try {
      await setBusinessStatus(id, next);
      toast.success(`Business ${next.toLowerCase()}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setPending(false);
    }
  }

  if (status === "ARCHIVED") {
    return <Button size="sm" variant="outline" disabled={pending} onClick={() => apply("ACTIVE")}>Restore</Button>;
  }
  return (
    <div className="flex gap-2">
      {status === "SUSPENDED" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => apply("ACTIVE")}>Activate</Button>
      ) : (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => apply("SUSPENDED")}>Suspend</Button>
      )}
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => apply("ARCHIVED")}>Archive</Button>
    </div>
  );
}

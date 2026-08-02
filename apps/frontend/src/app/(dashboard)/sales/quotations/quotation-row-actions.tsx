"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EnterpriseConfirmDialog } from "@/components/enterprise";
import { updateQuotationStatus } from "@/app/actions/quotation";
import { createSalesOrderFromQuote } from "@/app/actions/sales-order";

type QuotationStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";

interface ConfirmState {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  run: () => Promise<void>;
}

export function QuotationRowActions({
  id,
  code,
  status,
}: {
  id: string;
  code: string;
  status: QuotationStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);

  async function execute(fn: () => Promise<unknown>, successMsg: string, pushTo?: string) {
    setPending(true);
    try {
      await fn();
      toast.success(successMsg);
      if (pushTo) router.push(pushTo);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setPending(false);
      setConfirm(null);
    }
  }

  const setStatus = (next: QuotationStatus, msg: string) =>
    execute(() => updateQuotationStatus(id, next), msg);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={pending} aria-label={`Actions for ${code}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {status === "DRAFT" && (
            <DropdownMenuItem onSelect={() => setStatus("SENT", `${code} sent to customer`)}>
              Send to customer
            </DropdownMenuItem>
          )}
          {(status === "DRAFT" || status === "SENT") && (
            <DropdownMenuItem onSelect={() => setStatus("ACCEPTED", `${code} marked accepted`)}>
              Mark accepted
            </DropdownMenuItem>
          )}
          {(status === "DRAFT" || status === "SENT") && (
            <DropdownMenuItem
              className="text-destructive"
              onSelect={() =>
                setConfirm({
                  title: `Reject ${code}?`,
                  description: "The quotation will be marked rejected. You can re-open it as a draft later.",
                  confirmLabel: "Reject",
                  destructive: true,
                  run: () => setStatus("REJECTED", `${code} rejected`),
                })
              }
            >
              Mark rejected
            </DropdownMenuItem>
          )}
          {status === "ACCEPTED" && (
            <DropdownMenuItem
              onSelect={() =>
                setConfirm({
                  title: `Convert ${code} to a sales order?`,
                  description: "A new sales order will be created from this quotation's lines and you'll be taken to it.",
                  confirmLabel: "Convert to Order",
                  run: () =>
                    execute(() => createSalesOrderFromQuote(id), `Sales order created from ${code}`, "/sales/orders"),
                })
              }
            >
              Convert to Sales Order
            </DropdownMenuItem>
          )}
          {(status === "REJECTED" || status === "EXPIRED") && (
            <DropdownMenuItem onSelect={() => setStatus("DRAFT", `${code} re-opened as draft`)}>
              Re-open as draft
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            Status: {status}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EnterpriseConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        destructive={confirm?.destructive}
        pending={pending}
        onConfirm={() => confirm?.run()}
      />
    </>
  );
}

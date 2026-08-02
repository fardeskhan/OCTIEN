"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, PackageCheck, Truck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnterpriseConfirmDialog } from "@/components/enterprise";
import {
  approveSalesOrder,
  confirmSalesOrder,
  fulfillSalesOrder,
  cancelSalesOrder,
} from "@/app/actions/sales-order";

type SalesOrderStatus = "DRAFT" | "APPROVED" | "CONFIRMED" | "PARTIALLY_FULFILLED" | "FULFILLED" | "CANCELLED";

interface ConfirmState {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  run: () => Promise<void>;
}

export function SalesOrderActions({ id, code, status }: { id: string; code: string; status: SalesOrderStatus }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);

  async function execute(fn: () => Promise<unknown>, successMsg: string) {
    setPending(true);
    try {
      await fn();
      toast.success(successMsg);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setPending(false);
      setConfirm(null);
    }
  }

  const terminal = status === "FULFILLED" || status === "CANCELLED";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "DRAFT" && (
        <Button size="sm" disabled={pending} onClick={() => execute(() => approveSalesOrder(id), `${code} approved`)}>
          <CheckCircle2 className="h-4 w-4" /> Approve
        </Button>
      )}

      {status === "APPROVED" && (
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            setConfirm({
              title: `Confirm ${code}?`,
              description: "Confirming reserves stock for each line in the default warehouse and moves the order into fulfilment.",
              confirmLabel: "Confirm & reserve",
              run: () => execute(() => confirmSalesOrder(id), `${code} confirmed — inventory reserved`),
            })
          }
        >
          <PackageCheck className="h-4 w-4" /> Confirm &amp; reserve
        </Button>
      )}

      {(status === "CONFIRMED" || status === "PARTIALLY_FULFILLED") && (
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            setConfirm({
              title: `Fulfil ${code}?`,
              description: "Marks the order fulfilled and emits the fulfilment event for shipment/delivery.",
              confirmLabel: "Fulfil order",
              run: () => execute(() => fulfillSalesOrder(id), `${code} fulfilled`),
            })
          }
        >
          <Truck className="h-4 w-4" /> Fulfil
        </Button>
      )}

      {!terminal && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            setConfirm({
              title: `Cancel ${code}?`,
              description: "The order will be cancelled and any inventory it reserved will be released back to available stock.",
              confirmLabel: "Cancel order",
              destructive: true,
              run: () => execute(() => cancelSalesOrder(id), `${code} cancelled`),
            })
          }
        >
          <XCircle className="h-4 w-4" /> Cancel
        </Button>
      )}

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
    </div>
  );
}

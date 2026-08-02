"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PackageCheck, Boxes, Truck, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnterpriseConfirmDialog } from "@/components/enterprise";
import { updateShipmentStatus } from "@/app/actions/fulfillment";

type ShipmentStatus =
  | "DRAFT" | "PICKING" | "PACKING" | "LOADED" | "READY_TO_DISPATCH"
  | "DISPATCHED" | "PARTIALLY_DELIVERED" | "DELIVERED" | "CANCELLED";

interface LineRef { id: string; requestedQty: number }

interface ConfirmState {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  run: () => Promise<void>;
}

export function ShipmentActions({
  id,
  code,
  status,
  lines,
}: {
  id: string;
  code: string;
  status: ShipmentStatus;
  lines: LineRef[];
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);

  async function run(
    next: "PICKING" | "PACKING" | "DISPATCHED" | "DELIVERED" | "CANCELLED",
    msg: string,
    linesData?: { id: string; pickedQty?: number; packedQty?: number; shippedQty?: number }[],
  ) {
    setPending(true);
    try {
      await updateShipmentStatus(id, next, linesData);
      toast.success(msg);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setPending(false);
      setConfirm(null);
    }
  }

  const terminal = status === "DELIVERED" || status === "CANCELLED";
  const preDispatch = status === "DRAFT" || status === "PICKING" || status === "PACKING";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "DRAFT" && (
        <Button size="sm" disabled={pending} onClick={() => run("PICKING", `${code} — picking started`)}>
          <Boxes className="h-4 w-4" /> Start picking
        </Button>
      )}

      {status === "PICKING" && (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => run("PACKING", `${code} — packed`, lines.map((l) => ({ id: l.id, pickedQty: l.requestedQty })))}
        >
          <PackageCheck className="h-4 w-4" /> Mark packed
        </Button>
      )}

      {status === "PACKING" && (
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            setConfirm({
              title: `Dispatch ${code}?`,
              description: "Dispatching deducts stock from the warehouse, releases the reservation, generates the invoice and posts the accounting entries. This cannot be undone.",
              confirmLabel: "Dispatch",
              run: () => run("DISPATCHED", `${code} dispatched`, lines.map((l) => ({ id: l.id, packedQty: l.requestedQty, shippedQty: l.requestedQty }))),
            })
          }
        >
          <Truck className="h-4 w-4" /> Dispatch
        </Button>
      )}

      {(status === "DISPATCHED" || status === "PARTIALLY_DELIVERED") && (
        <Button size="sm" disabled={pending} onClick={() => run("DELIVERED", `${code} delivered`)}>
          <CheckCircle2 className="h-4 w-4" /> Mark delivered
        </Button>
      )}

      {preDispatch && !terminal && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            setConfirm({
              title: `Cancel ${code}?`,
              description: "The shipment will be cancelled. Cancel is only allowed before dispatch (no stock has moved yet).",
              confirmLabel: "Cancel shipment",
              destructive: true,
              run: () => run("CANCELLED", `${code} cancelled`),
            })
          }
        >
          <XCircle className="h-4 w-4" /> Cancel
        </Button>
      )}

      {terminal && <span className="text-sm text-muted-foreground">No further actions — {status.toLowerCase()}.</span>}

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

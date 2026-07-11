"use client"
import * as React from "react"
import Link from "next/link"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EntityDrawer } from "@/components/layout/drawer-layout"
import { Supplier } from "@/types"

export type SupplierRow = Supplier & {
  code: string
  riskLevel: string
  paymentTerms: string
  activeOrders: number
}

export function SuppliersList({ data }: { data: SupplierRow[] }) {
  const [selected, setSelected] = React.useState<SupplierRow | null>(null)

  const columns: ColumnDef<SupplierRow>[] = [
    {
      accessorKey: "name",
      header: "Supplier Name",
      cell: ({ row }) => (
        <span
          className="font-medium text-primary hover:underline cursor-pointer"
          onClick={() => setSelected(row.original)}
        >
          {row.getValue("name")}
        </span>
      ),
    },
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("code")}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={status === "Active" ? "default" : status === "Pending Review" ? "warning" : "secondary"}>
            {status}
          </Badge>
        )
      }
    },
    {
      accessorKey: "riskLevel",
      header: "Risk",
      cell: ({ row }) => {
        const risk = row.getValue("riskLevel") as string
        return <Badge variant={risk === "LOW" ? "outline" : risk === "MEDIUM" ? "warning" : "destructive"}>{risk}</Badge>
      }
    },
    {
      accessorKey: "activeOrders",
      header: () => <div className="text-right">Active POs</div>,
      cell: ({ row }) => <div className="text-right font-medium">{row.getValue("activeOrders")}</div>,
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Suppliers"
        description="Manage vendor relationships, risk, and contracts."
        actions={<Link href="/operations/procurement/suppliers/new" className={buttonVariants()}>New Supplier</Link>}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable columns={columns} data={data} searchPlaceholder="Search suppliers…" statusKey="status" />
      </div>

      <EntityDrawer
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected?.name}
        kpis={
          <>
            <div className="flex flex-col gap-1 border-r border-border px-4 first:pl-0">
              <span className="text-xs text-muted-foreground">Risk Level</span>
              <span className="font-semibold">{selected?.riskLevel}</span>
            </div>
            <div className="flex flex-col gap-1 border-r border-border px-4">
              <span className="text-xs text-muted-foreground">Payment Terms</span>
              <span className="font-semibold">{selected?.paymentTerms || "—"}</span>
            </div>
            <div className="flex flex-col gap-1 px-4">
              <span className="text-xs text-muted-foreground">Status</span>
              <Badge className="w-fit" variant={selected?.status === "Active" ? "default" : "warning"}>
                {selected?.status}
              </Badge>
            </div>
          </>
        }
        tabs={
          <div className="flex gap-4 border-b border-border mt-4">
            <div className="border-b-2 border-primary pb-2 text-sm font-medium">Summary</div>
          </div>
        }
        actions={
          selected ? (
            <Link href={`/operations/procurement/suppliers/${selected.id}`} className={buttonVariants()}>Open Supplier</Link>
          ) : null
        }
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-4">Supplier Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Supplier Code</span>
                <p className="text-sm">{selected?.code}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Active Purchase Orders</span>
                <p className="text-sm">{selected?.activeOrders}</p>
              </div>
            </div>
          </div>
        </div>
      </EntityDrawer>
    </WorkspaceLayout>
  )
}

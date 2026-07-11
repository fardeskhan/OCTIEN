"use client"
import * as React from "react"
import Link from "next/link"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { DataTable } from "@/components/ui/data-table"
import { EntityDrawer } from "@/components/layout/drawer-layout"
import { ColumnDef } from "@tanstack/react-table"
import { buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Product } from "@/types"
import { formatINR } from "@/lib/currency"

export function ProductsList({ data }: { data: Product[] }) {
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null)

  const columns: ColumnDef<Product>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <span
          className="font-medium text-primary hover:underline cursor-pointer"
          onClick={() => setSelectedProduct(row.original)}
        >
          {row.getValue("code")}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Product Name",
    },
    {
      accessorKey: "category",
      header: "Category",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={status === "Active" ? "default" : status === "Draft" ? "secondary" : "outline"}>
            {status}
          </Badge>
        )
      }
    },
    {
      accessorKey: "stock",
      header: () => <div className="text-right">Stock Level</div>,
      cell: ({ row }) => <div className="text-right font-medium">{(row.getValue("stock") as number).toLocaleString()}</div>,
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Products"
        description="Manage product catalog and master data."
        actions={<Link href="/inventory/products/new" className={buttonVariants()}>New Product</Link>}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable
          columns={columns}
          data={data}
          searchPlaceholder="Search products…"
          statusKey="status"
        />
      </div>

      <EntityDrawer
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
        title={selectedProduct?.name}
        kpis={
          <>
            <div className="flex flex-col gap-1 border-r border-border px-4 first:pl-0">
              <span className="text-xs text-muted-foreground">Code</span>
              <span className="font-semibold">{selectedProduct?.code}</span>
            </div>
            <div className="flex flex-col gap-1 border-r border-border px-4">
              <span className="text-xs text-muted-foreground">Status</span>
              <Badge className="w-fit" variant={selectedProduct?.status === "Active" ? "default" : "secondary"}>
                {selectedProduct?.status}
              </Badge>
            </div>
            <div className="flex flex-col gap-1 px-4">
              <span className="text-xs text-muted-foreground">Stock Level</span>
              <span className="font-semibold">{(selectedProduct?.stock ?? 0).toLocaleString()} Units</span>
            </div>
          </>
        }
        tabs={
          <div className="flex gap-4 border-b border-border mt-4">
            <div className="border-b-2 border-primary pb-2 text-sm font-medium">Summary</div>
          </div>
        }
        actions={
          <>
            {selectedProduct && (
              <Link href={`/inventory/products/${selectedProduct.id}`} className={buttonVariants()}>Open Product</Link>
            )}
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Category</span>
                <p className="text-sm">{selectedProduct?.category}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Base Price</span>
                <p className="text-sm">{formatINR(selectedProduct?.price ?? 0)}</p>
              </div>
            </div>
          </div>
        </div>
      </EntityDrawer>
    </WorkspaceLayout>
  )
}

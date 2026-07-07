"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EntityDrawer } from "@/components/layout/drawer-layout"
import { JournalEntry } from "@/types"
import { mockJournals } from "@/app/(dashboard)/_data/finance"



export default function JournalsPage() {
  const [selectedJE, setSelectedJE] = React.useState<JournalEntry | null>(null)

  const columns: ColumnDef<JournalEntry>[] = [
    {
      accessorKey: "id",
      header: "Journal ID",
      cell: ({ row }) => (
        <span 
          className="font-medium text-primary hover:underline cursor-pointer"
          onClick={() => setSelectedJE(row.original)}
        >
          {row.getValue("id")}
        </span>
      ),
    },
    {
      accessorKey: "date",
      header: "Date",
    },
    {
      accessorKey: "reference",
      header: "Reference",
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="truncate max-w-[200px] block">{row.getValue("description")}</span>
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={status === "Posted" ? "default" : status === "Draft" ? "secondary" : "destructive"}>
            {status}
          </Badge>
        )
      }
    },
    {
      accessorKey: "debit",
      header: () => <div className="text-right">Debit Total</div>,
      cell: ({ row }) => <div className="text-right">${(row.getValue("debit") as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>,
    },
    {
      accessorKey: "credit",
      header: () => <div className="text-right">Credit Total</div>,
      cell: ({ row }) => <div className="text-right">${(row.getValue("credit") as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>,
    },
  ]

  const difference = selectedJE ? Math.abs(selectedJE.debit - selectedJE.credit) : 0

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Journal Entries" 
        description="Manage and review manual and automated journal entries."
        actions={<Button>New Journal Entry</Button>}
      />
      
      <FilterBar 
        placeholder="Search journals..." 
        views={["All", "Drafts", "Posted", "Reversals"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockJournals} 
        />
      </div>

      <EntityDrawer
        open={!!selectedJE}
        onOpenChange={(open) => !open && setSelectedJE(null)}
        title={`Journal: ${selectedJE?.id}`}
        kpis={
          <>
            <div className="flex flex-col gap-1 border-r border-border px-4 first:pl-0">
              <span className="text-xs text-muted-foreground">Debit Total</span>
              <span className="font-semibold">${selectedJE?.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col gap-1 border-r border-border px-4">
              <span className="text-xs text-muted-foreground">Credit Total</span>
              <span className="font-semibold">${selectedJE?.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col gap-1 border-r border-border px-4">
              <span className="text-xs text-muted-foreground">Difference</span>
              <span className={`font-semibold ${difference > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-500"}`}>
                ${difference.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex flex-col gap-1 px-4">
              <span className="text-xs text-muted-foreground">Status</span>
              <Badge className="w-fit" variant={selectedJE?.status === "Posted" ? "default" : "secondary"}>
                {selectedJE?.status}
              </Badge>
            </div>
          </>
        }
        tabs={
          <div className="flex gap-4 border-b border-border mt-4">
            <div className="border-b-2 border-primary pb-2 text-sm font-medium cursor-pointer">Lines</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Documents</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Audit</div>
          </div>
        }
        actions={
          <>
            <Button variant="outline">Reverse</Button>
            {selectedJE?.status === "Draft" && <Button>Post Entry</Button>}
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-4">Header Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Date</span>
                <p className="text-sm">{selectedJE?.date}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Reference</span>
                <p className="text-sm">{selectedJE?.reference}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <span className="text-xs text-muted-foreground">Description</span>
                <p className="text-sm">{selectedJE?.description}</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-4">Journal Lines</h3>
            <div className="border border-border rounded-md overflow-hidden">
              <div className="grid grid-cols-4 bg-muted/40 p-2 text-xs font-medium text-muted-foreground uppercase">
                 <div className="col-span-2">Account</div>
                 <div className="text-right">Debit</div>
                 <div className="text-right">Credit</div>
              </div>
              <div className="grid grid-cols-4 p-2 text-sm border-t border-border">
                 <div className="col-span-2 text-primary hover:underline cursor-pointer">1000 - Cash</div>
                 <div className="text-right tabular-nums">${selectedJE?.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                 <div className="text-right tabular-nums">-</div>
              </div>
              <div className="grid grid-cols-4 p-2 text-sm border-t border-border">
                 <div className="col-span-2 text-primary hover:underline cursor-pointer">4000 - Revenue</div>
                 <div className="text-right tabular-nums">-</div>
                 <div className="text-right tabular-nums">${selectedJE?.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>
        </div>
      </EntityDrawer>
    </WorkspaceLayout>
  )
}

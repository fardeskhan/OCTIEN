"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { TrialBalanceEntry } from "@/types"
import { mockTrialBalance } from "@/app/(dashboard)/_data/finance"



export default function TrialBalancePage() {
  const columns: ColumnDef<TrialBalanceEntry>[] = [
    {
      accessorKey: "account",
      header: "Account Code",
      cell: ({ row }) => <span className="font-medium text-primary cursor-pointer hover:underline">{row.getValue("account")}</span>
    },
    {
      accessorKey: "name",
      header: "Account Name",
    },
    {
      accessorKey: "type",
      header: "Type",
    },
    {
      accessorKey: "debit",
      header: () => <div className="text-right">Debit Balance</div>,
      cell: ({ row }) => {
        const val = row.getValue("debit") as number | null
        return <div className="text-right tabular-nums">{val !== null ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</div>
      },
    },
    {
      accessorKey: "credit",
      header: () => <div className="text-right">Credit Balance</div>,
      cell: ({ row }) => {
        const val = row.getValue("credit") as number | null
        return <div className="text-right tabular-nums">{val !== null ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</div>
      },
    },
  ]

  const totalDebit = mockTrialBalance.reduce((acc, curr) => acc + (curr.debit || 0), 0)
  const totalCredit = mockTrialBalance.reduce((acc, curr) => acc + (curr.credit || 0), 0)

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Trial Balance" 
        description="Verify the mathematical accuracy of the double-entry accounting system."
        actions={<Button variant="outline">Run Report</Button>}
      />
      
      <FilterBar 
        placeholder="Search accounts..." 
        views={["As of Today", "End of Last Month", "Year to Date"]}
      />

      <div className="flex-1 overflow-hidden mt-4 flex flex-col">
        <DataTable 
          columns={columns} 
          data={mockTrialBalance} 
        />
        <div className="mt-4 p-4 border border-border bg-muted/20 rounded-md grid grid-cols-5 font-semibold">
           <div className="col-span-3 text-right">Totals:</div>
           <div className="text-right tabular-nums">${totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
           <div className="text-right tabular-nums">${totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}

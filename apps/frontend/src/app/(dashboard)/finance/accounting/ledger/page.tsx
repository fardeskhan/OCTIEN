"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LedgerEntry } from "@/types"
import { mockLedger } from "@/app/(dashboard)/_data/finance"



export default function LedgerPage() {
  const columns: ColumnDef<LedgerEntry>[] = [
    {
      accessorKey: "date",
      header: "Date",
    },
    {
      accessorKey: "account",
      header: "Account",
      cell: ({ row }) => <span className="font-medium">{row.getValue("account")}</span>
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "journalRef",
      header: "Journal Ref",
      cell: ({ row }) => <span className="text-primary hover:underline cursor-pointer">{row.getValue("journalRef")}</span>
    },
    {
      accessorKey: "debit",
      header: () => <div className="text-right">Debit</div>,
      cell: ({ row }) => {
        const val = row.getValue("debit") as number | null
        return <div className="text-right tabular-nums">{val !== null ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</div>
      },
    },
    {
      accessorKey: "credit",
      header: () => <div className="text-right">Credit</div>,
      cell: ({ row }) => {
        const val = row.getValue("credit") as number | null
        return <div className="text-right tabular-nums">{val !== null ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}</div>
      },
    },
    {
      accessorKey: "runningBalance",
      header: () => <div className="text-right">Balance</div>,
      cell: ({ row }) => <div className="text-right tabular-nums font-medium">${(row.getValue("runningBalance") as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>,
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="General Ledger" 
        description="Detailed transaction history across all accounts."
        actions={<Button variant="outline">Export GL</Button>}
      />
      
      <FilterBar 
        placeholder="Filter by account, description..." 
        views={["All Accounts", "1000 - Cash", "2000 - AP", "4000 - Revenue"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockLedger} 
        />
      </div>
    </WorkspaceLayout>
  )
}

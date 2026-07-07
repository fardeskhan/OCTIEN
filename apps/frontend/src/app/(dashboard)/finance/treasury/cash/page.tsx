"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader, WorkspaceKPIs } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { KPICard } from "@/components/ui/kpi-card"
import { CashPosition } from "@/types"
import { mockCashPositions } from "@/app/(dashboard)/_data/finance"



export default function CashPositionPage() {
  const columns: ColumnDef<CashPosition>[] = [
    {
      accessorKey: "account",
      header: "Account Name",
      cell: ({ row }) => <span className="font-medium">{row.getValue("account")}</span>,
    },
    {
      accessorKey: "bank",
      header: "Bank",
    },
    {
      accessorKey: "currency",
      header: "Currency",
    },
    {
      accessorKey: "balance",
      header: () => <div className="text-right">Current Balance</div>,
      cell: ({ row }) => <div className="text-right font-medium">${(row.getValue("balance") as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>,
    },
    {
      accessorKey: "reconciledDate",
      header: "Last Reconciled",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("reconciledDate")}</span>,
    },
  ]

  const totalCash = mockCashPositions.reduce((acc, curr) => acc + curr.balance, 0)

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Cash Position" 
        description="Monitor liquidity across all corporate bank accounts."
        actions={<Button>Transfer Funds</Button>}
      />

      <WorkspaceKPIs>
        <KPICard title="Total Cash Liquidity" value={`$${(totalCash / 1000000).toFixed(2)}M`} trend={2.1} freshness="Live" />
        <KPICard title="Operating Cash" value="$850K" trend={-1.5} freshness="Live" />
        <KPICard title="Restricted/Reserve Cash" value="$245K" trend={0} freshness="Live" />
        <KPICard title="Accounts Reconciled" value="3/3" freshness="Updated 1h ago" />
      </WorkspaceKPIs>
      
      <FilterBar 
        placeholder="Search accounts..." 
        views={["All Accounts", "USD Accounts", "Operating Only"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockCashPositions} 
        />
      </div>
    </WorkspaceLayout>
  )
}
